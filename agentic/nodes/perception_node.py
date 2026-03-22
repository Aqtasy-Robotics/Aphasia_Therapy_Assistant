from __future__ import annotations

import os
import tempfile
import re

import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from groq import Groq

from agentic.state import SpeechTherapyState   # ✅ fixed import

load_dotenv()

# ── Groq client ──────────────────────────────────────────────────────────────
_API_KEY = os.getenv("GROQ_API")
if not _API_KEY:
    raise ValueError("GROQ_API key is not set")

_client = Groq(api_key=_API_KEY)

RECORD_SECONDS = int(os.getenv("RECORD_SECONDS", 8))


# ── Device detection ─────────────────────────────────────────────────────────

def _get_input_device():
    """Find USB mic automatically."""
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if dev["max_input_channels"] > 0 and "USB" in dev["name"]:
            print(f"[INFO] Using input device {i}: {dev['name']}")
            return i, int(dev["default_samplerate"])
    raise RuntimeError("No USB microphone found")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _record_audio() -> str:
    print("......🎤 Start Speaking now .......")

    device_index, device_rate = _get_input_device()
    samplerate = int(device_rate)

    audio = sd.rec(
        int(RECORD_SECONDS * samplerate),
        samplerate=samplerate,
        channels=1,
        dtype="float32",
        device=(device_index, None),
    )
    sd.wait()
    audio = audio.squeeze()

    # Resample to 16kHz for Whisper accuracy
    if samplerate != 16000:
        try:
            import librosa
            audio = librosa.resample(audio, orig_sr=samplerate, target_sr=16000)
            samplerate = 16000
        except ImportError:
            print("[WARNING] librosa not installed — skipping resample. Run: pip install librosa")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        sf.write(tmp.name, audio, samplerate)
        return tmp.name


def _transcribe_audio(file_path: str) -> tuple[str, float]:
    with open(file_path, "rb") as audio_file:
        result = _client.audio.transcriptions.create(
            model="whisper-large-v3",
            language="en",
            file=audio_file,
        )
    text = result.text.strip().lower()
    confidence = -0.3 if len(text) > 2 else -1.5
    return text, confidence


def _looks_non_english(text: str) -> bool:
    if not text:
        return False
    has_alpha = bool(re.search(r"[A-Za-z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]", text))
    has_latin = bool(re.search(r"[A-Za-z]", text))
    return has_alpha and not has_latin


# ── LangGraph node ───────────────────────────────────────────────────────────

def perception_node(state: SpeechTherapyState) -> dict:
    audio_path: str | None = None
    retry_count = state.get("retry_count", 0) + 1
    transcript_attempts = list(state.get("transcript_attempts") or [])  # ✅ preserve history

    try:
        audio_path = _record_audio()
        print("Transcribing audio...")
        text, confidence = _transcribe_audio(audio_path)
        print(f"Transcription: {text!r} (confidence: {confidence:.2f})")

        # ✅ always report what happened THIS attempt, not a merged old+new reason
        failure_reason = None
        if not text.strip():
            failure_reason = "silence"
        elif confidence < -1.0:
            failure_reason = "noise"
        elif _looks_non_english(text):
            failure_reason = "non_english"

        transcript_attempts.append({
            "transcript":     text,
            "confidence":     confidence,
            "failure_reason": failure_reason,
        })

        return {
            "transcript":                text,
            "confidence_score":          confidence,
            "retry_count":               retry_count,
            "perception_failure_reason": failure_reason,   # ✅ fixed key name
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
            "perception_failure_reason": failure_reason,   # ✅ fixed key name
            "transcript_attempts":       transcript_attempts,
            "current_error":             str(exc),
        }

    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass