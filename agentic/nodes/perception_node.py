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

from edges import CONFIDENCE_THRESHOLD
from nodes.execution_node import _get_failure_reason_message
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


def _detect_perception_failure_reason(transcript: str, confidence: float, target_word: str | None) -> str | None:
    """Infer why a recording attempt failed so we can give a better prompt.

    The three common failure modes are:
      - silence: user didn't speak (empty transcript)
      - noise: low confidence but the transcript contains the expected word
      - non_english: low confidence and the transcript doesn't match the target
    """
    if not transcript.strip():
        return "silence"

    if confidence < CONFIDENCE_THRESHOLD:
        # If they said something different than the target word, assume they
        # might be speaking in another language or saying a different phrase.
        if target_word and target_word.strip() and target_word.lower() not in transcript.lower():
            return "non_english"
        return "noise"

    return None


# ── LangGraph node ───────────────────────────────────────────────────────────

def perception_node(state: SpeechTherapyState) -> dict:
    """LangGraph node: record audio → transcribe → update state.

    Increments retry_count so the conditional edge can cap retries.
    Provides a targeted hint when re-recording to improve the patient's experience.
    """
    audio_path: str | None = None

    # If we are re-recording, give a gentle hint about why the previous attempt failed.
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
            "transcript": text,
            "confidence": confidence,
            "failure_reason": failure_reason,
        })

        return {
            "transcript":               text,
            "confidence_score":         confidence,
            "retry_count":              retry_count,
            "perception_failure_reason": failure_reason,
            "transcript_attempts":      transcript_attempts,
            "current_error":            None,
        }

    except Exception as exc:
        print(f"[perception_node] ERROR: {exc}")
        failure_reason = "error"
        transcript_attempts.append({
            "transcript": "",
            "confidence": -9.9,
            "failure_reason": failure_reason,
            "error": str(exc),
        })
        return {
            "transcript":               "",
            "confidence_score":         -9.9,
            "retry_count":              retry_count,
            "perception_failure_reason": failure_reason,
            "transcript_attempts":      transcript_attempts,
            "current_error":            str(exc),
        }
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass
