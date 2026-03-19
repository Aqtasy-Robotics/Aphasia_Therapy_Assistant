"""
nodes/perception_node.py — Whisper STT wrapped as a LangGraph node.

Original logic from final_perception.py is preserved exactly.
The only change: instead of printing + returning a plain string,
we return a state-dict patch so LangGraph can merge it.
"""

from __future__ import annotations

import os
import tempfile

import numpy as np
import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from groq import Groq

from state import SpeechTherapyState

load_dotenv()

# ── Groq client (same setup as original) ────────────────────────────────────
_API_KEY = os.getenv("GROQ_API")
if not _API_KEY:
    raise ValueError(
        "GROQ_API key is not set in the environment variables. "
        "Please set it in the .env file."
    )

_client = Groq(api_key=_API_KEY)

SAMPLE_RATE    = int(os.getenv("SAMPLE_RATE", 16000))
RECORD_SECONDS = int(os.getenv("RECORD_SECONDS", 8))


# ── Helpers (unchanged from original) ───────────────────────────────────────

def _record_audio() -> str:
    """Record from mic, save to a temp .wav, return its path."""
    print("......🎤 Start Speaking now .......")
    audio = sd.rec(
        int(RECORD_SECONDS * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
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

    # Groq's transcription object doesn't expose avg_logprob directly,
    # so we use a simple heuristic: empty / very short = low confidence.
    confidence = -0.3 if len(text) > 2 else -1.5
    return text, confidence


def _detect_failure_reason(audio_path: str, transcript: str, confidence: float) -> str | None:
    """
    Classify the reason for a perception failure.
    Returns: "silence", "noise", "non_english", or None (success).
    
    Priority: silence > non_english > noise
    (silence is most obvious user error, noise is detectable from confidence, 
     non-English is least certain but important for patient guidance).
    """
    
    # ── Detect silence: RMS energy of audio is very low ───────────────────
    try:
        audio_data, _ = sf.read(audio_path)
        rms_energy = np.sqrt(np.mean(audio_data ** 2))
        
        # If RMS is below threshold (0.01), audio is essentially silent
        if rms_energy < 0.01:
            print("[detection] Silence detected (RMS energy too low).")
            return "silence"
    except Exception as exc:
        print(f"[detection] Could not compute RMS energy: {exc}")
    
    # ── Detect non-English: Empty or very short transcript despite good recording ─
    # If we have a recording but got almost nothing back, likely non-English
    # This is a heuristic: could also check if Whisper detected a different language
    if not transcript.strip() or (len(transcript.strip()) < 2 and confidence > -2.0):
        # Transcript is empty or too short, but confidence suggests audio was OK
        # Likely non-English or gibberish
        print("[detection] Possible non-English: empty/short transcript with marginal confidence.")
        return "non_english"
    
    # ── Detect noise: Low confidence + some transcript ──────────────────
    # Confidence < -1.2 suggests noisy recording, but transcript exists
    NOISE_CONFIDENCE_THRESHOLD = -1.2
    if confidence < NOISE_CONFIDENCE_THRESHOLD and transcript.strip():
        print(f"[detection] Noise detected (confidence {confidence:.2f} below {NOISE_CONFIDENCE_THRESHOLD}).")
        return "noise"
    
    # ── No failure detected ───────────────────────────────────────────────
    return None


# ── LangGraph node ───────────────────────────────────────────────────────────

def perception_node(state: SpeechTherapyState) -> dict:
    """
    LangGraph node: record audio → transcribe → update state.
    Increments retry_count so the conditional edge can cap retries.
    """
    audio_path: str | None = None
    try:
        audio_path = _record_audio()
        print("Transcribing audio...")
        text, confidence = _transcribe_audio(audio_path)
        print(f"Transcription: {text!r}  (confidence proxy: {confidence:.2f})")

        return {
            "transcript":       text,
            "confidence_score": confidence,
            "retry_count":      state.get("retry_count", 0) + 1,
            "current_error":    None,
        }

    except Exception as exc:
        print(f"[perception_node] ERROR: {exc}")
        return {
            "transcript":       "",
            "confidence_score": -9.9,
            "retry_count":      state.get("retry_count", 0) + 1,
            "current_error":    str(exc),
        }
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass
