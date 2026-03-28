"""
nodes/perception_node.py — Whisper STT wrapped as a LangGraph node.

UPDATED FOR PI → LAPTOP ARCHITECTURE:
- If `state["audio_path"]` is already set (Pi sent audio via HTTP), transcribe
  that file directly — no mic recording.
- If `ROBOT_REMOTE_MODE=1` env var is set and no audio_path is provided, return
  a "no_audio" signal so the server knows to ask the Pi to re-record.
- If running locally (no env var), fall back to original laptop mic recording.
"""

from __future__ import annotations

import os
import tempfile

import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from groq import Groq

from agentic.edges import CONFIDENCE_THRESHOLD
from agentic.nodes.execution_node import _get_failure_reason_message
from agentic.state import SpeechTherapyState

load_dotenv()

# ── Remote mode flag ─────────────────────────────────────────────────────────
# Set by laptop_server.py before this module is imported.
# When True, perception_node will NOT try to record from the local mic.
_REMOTE_MODE: bool = os.getenv("ROBOT_REMOTE_MODE", "0").lower() in ("1", "true", "yes")

# ── Groq client ───────────────────────────────────────────────────────────────
_API_KEY = os.getenv("GROQ_API")
if not _API_KEY:
    raise ValueError(
        "GROQ_API key is not set in the environment variables. "
        "Please set it in the .env file."
    )

_client = Groq(api_key=_API_KEY)

SAMPLE_RATE    = int(os.getenv("SAMPLE_RATE", 16000))
RECORD_SECONDS = int(os.getenv("RECORD_SECONDS", 8))


# ── Default input device (local mic fallback) ────────────────────────────────

def _find_default_microphone() -> int:
    """
    Return the index of the system's default input device.
    Only called in local mode (ROBOT_REMOTE_MODE not set).
    """
    try:
        default = sd.query_devices(kind="input")
        devices = sd.query_devices()
        for idx, d in enumerate(devices):
            if d["name"] == default["name"] and d["max_input_channels"] >= 1:
                print(f"[perception_node] Using default input device [{idx}]: {d['name']!r}")
                return idx
    except Exception:
        pass

    for idx, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] >= 1:
            print(f"[perception_node] Fallback input device [{idx}]: {d['name']!r}")
            return idx

    raise RuntimeError(
        "No input device found. Check that your mic is enabled "
        "and not blocked by OS privacy settings."
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _record_audio() -> str:
    """Record from the local mic (used only when ROBOT_REMOTE_MODE is not set)."""
    device_index = _find_default_microphone()
    print("......🎤 Start Speaking now .......")
    audio = sd.rec(
        int(RECORD_SECONDS * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        device=device_index,
    )
    sd.wait()
    audio = audio.squeeze()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        sf.write(tmp.name, audio, SAMPLE_RATE)
        return tmp.name


def _transcribe_audio(file_path: str) -> tuple[str, float]:
    """
    Transcribe a WAV file with Whisper via Groq.
    Returns (transcript_text, confidence_proxy).
    """
    with open(file_path, "rb") as audio_file:
        result = _client.audio.transcriptions.create(
            model="whisper-large-v3",
            language="en",
            file=audio_file,
        )
    text = result.text.strip().lower()
    confidence = -0.3 if len(text) > 2 else -1.5
    return text, confidence


def _detect_perception_failure_reason(
    transcript: str, confidence: float, target_word: str | None
) -> str | None:
    if not transcript.strip():
        return "silence"
    if confidence < CONFIDENCE_THRESHOLD:
        if target_word and target_word.strip() and target_word.lower() not in transcript.lower():
            return "non_english"
        return "noise"
    return None


# ── LangGraph node ────────────────────────────────────────────────────────────

def perception_node(state: SpeechTherapyState) -> dict:
    """
    LangGraph node: receive or record audio → transcribe → update state.

    Flow:
      1. If state["audio_path"] is set and file exists → transcribe it (Pi sent audio).
      2. Else if ROBOT_REMOTE_MODE is set → return "no_audio" to stop the graph
         and signal the server to ask the Pi to re-record.
      3. Else → record from local mic (original development/local mode).
    """
    prev_reason = state.get("perception_failure_reason")
    target_word = state.get("target_word") or ""
    if prev_reason and prev_reason != "no_audio":
        msg = _get_failure_reason_message(prev_reason, target_word)
        if msg:
            print(msg)

    retry_count = state.get("retry_count", 0) + 1
    transcript_attempts = list(state.get("transcript_attempts") or [])

    audio_path: str | None = state.get("audio_path")
    audio_from_pi = bool(audio_path and os.path.exists(str(audio_path)))

    # ── Case 2: Remote mode, no audio supplied ────────────────────
    if _REMOTE_MODE and not audio_from_pi:
        print("[perception_node] Remote mode: no audio path in state — signalling retry to server.")
        transcript_attempts.append({
            "transcript":     "",
            "confidence":     -9.9,
            "failure_reason": "no_audio",
        })
        return {
            "transcript":                "",
            "confidence_score":          -9.9,
            "retry_count":               retry_count,
            "perception_failure_reason": "no_audio",
            "transcript_attempts":       transcript_attempts,
            "current_error":             None,
            "audio_path":                None,
        }

    # ── Cases 1 & 3: transcribe (from Pi file or local recording) ─
    path_to_transcribe: str | None = None
    recorded_locally = False

    try:
        if audio_from_pi:
            print(f"[perception_node] Using audio sent from Pi: {audio_path}")
            path_to_transcribe = str(audio_path)
        else:
            # Local mode: record from attached mic
            path_to_transcribe = _record_audio()
            recorded_locally = True

        print("Transcribing audio...")
        text, confidence = _transcribe_audio(path_to_transcribe)
        print(f"Transcription: {text!r}  (confidence proxy: {confidence:.2f})")

        failure_reason = _detect_perception_failure_reason(text, confidence, target_word)
        transcript_attempts.append({
            "transcript":     text,
            "confidence":     confidence,
            "failure_reason": failure_reason,
        })

        return {
            "transcript":                text,
            "confidence_score":          confidence,
            "retry_count":               retry_count,
            "perception_failure_reason": failure_reason,
            "transcript_attempts":       transcript_attempts,
            "current_error":             None,
            "audio_path":                None,  # clear after use
        }

    except Exception as exc:
        print(f"[perception_node] ERROR: {exc}")
        transcript_attempts.append({
            "transcript":     "",
            "confidence":     -9.9,
            "failure_reason": "error",
            "error":          str(exc),
        })
        return {
            "transcript":                "",
            "confidence_score":          -9.9,
            "retry_count":               retry_count,
            "perception_failure_reason": "error",
            "transcript_attempts":       transcript_attempts,
            "current_error":             str(exc),
            "audio_path":                None,
        }
    finally:
        # Only delete the file if we recorded it locally (not if Pi sent it)
        if recorded_locally and path_to_transcribe and os.path.exists(path_to_transcribe):
            try:
                os.remove(path_to_transcribe)
            except OSError:
                pass