"""
nodes/perception_node.py — Whisper STT wrapped as a LangGraph node.

Original logic from final_perception.py is preserved exactly.
The only change: instead of printing + returning a plain string,
we return a state-dict patch so LangGraph can merge it.
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

# ── Groq client ──────────────────────────────────────────────────────────────
_API_KEY = os.getenv("GROQ_API")
if not _API_KEY:
    raise ValueError(
        "GROQ_API key is not set in the environment variables. "
        "Please set it in the .env file."
    )

_client = Groq(api_key=_API_KEY)

SAMPLE_RATE    = int(os.getenv("SAMPLE_RATE", 16000))
RECORD_SECONDS = int(os.getenv("RECORD_SECONDS", 8))


# ── Default input device (laptop mic) ───────────────────────────────────────

def _find_default_microphone() -> int:
    """
    Return the index of the system's default input device — the built-in
    laptop mic on most machines.

    Falls back to the first available input device if sounddevice cannot
    resolve a default, and raises RuntimeError if no input device exists at all.
    """
    # Try the OS-reported default input device first.
    try:
        default = sd.query_devices(kind="input")
        # query_devices(kind=) returns a single device dict.
        # We need its index — find it by matching the name.
        devices = sd.query_devices()
        for idx, d in enumerate(devices):
            if d["name"] == default["name"] and d["max_input_channels"] >= 1:
                print(f"[perception_node] Using default input device [{idx}]: {d['name']!r}")
                return idx
    except Exception:
        pass  # fall through to manual scan

    # Manual fallback: first device with at least one input channel.
    for idx, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] >= 1:
            print(f"[perception_node] Fallback input device [{idx}]: {d['name']!r}")
            return idx

    raise RuntimeError(
        "No input device found. Check that your laptop mic is enabled "
        "and not blocked by the OS privacy settings."
    )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _record_audio() -> str:
    """Record from the laptop's default mic, save to a temp .wav, return its path."""
    device_index = _find_default_microphone()

    print("......🎤 Start Speaking now .......")
    audio = sd.rec(
        int(RECORD_SECONDS * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        device=device_index,   # ← pinned to the default laptop mic
    )
    sd.wait()
    audio = audio.squeeze()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        sf.write(tmp.name, audio, SAMPLE_RATE)
        return tmp.name


def _transcribe_audio(file_path: str) -> tuple[str, float]:
    """
    Transcribe audio with Whisper.
    Returns (transcript_text, avg_logprob).
    avg_logprob is a rough confidence proxy: closer to 0 = more confident.
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
    """Infer why a recording attempt failed so we can give a better prompt."""
    if not transcript.strip():
        return "silence"

    if confidence < CONFIDENCE_THRESHOLD:
        if target_word and target_word.strip() and target_word.lower() not in transcript.lower():
            return "non_english"
        return "noise"

    return None


# ── LangGraph node ───────────────────────────────────────────────────────────

def perception_node(state: SpeechTherapyState) -> dict:
    """LangGraph node: record audio → transcribe → update state."""
    audio_path: str | None = None

    prev_reason = state.get("perception_failure_reason")
    target_word = state.get("target_word") or ""
    if prev_reason:
        msg = _get_failure_reason_message(prev_reason, target_word)
        if msg:
            print(msg)

    retry_count = state.get("retry_count", 0) + 1
    transcript_attempts = list(state.get("transcript_attempts") or [])

    try:
        audio_path = _record_audio()
        print("Transcribing audio...")
        text, confidence = _transcribe_audio(audio_path)
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
        }

    except Exception as exc:
        print(f"[perception_node] ERROR: {exc}")
        failure_reason = "error"
        transcript_attempts.append({
            "transcript":     "",
            "confidence":     -9.9,
            "failure_reason": failure_reason,
            "error":          str(exc),
        })
        return {
            "transcript":                "",
            "confidence_score":          -9.9,
            "retry_count":               retry_count,
            "perception_failure_reason": failure_reason,
            "transcript_attempts":       transcript_attempts,
            "current_error":             str(exc),
        }
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass