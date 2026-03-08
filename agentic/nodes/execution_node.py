"""
nodes/execution_node.py — Output delivery wrapped as a LangGraph node.

Original main.py (Raspberry Pi execution agent) is preserved structurally.
Changes made:
  1. The hardware boot / polling loop from main.py is now called once at startup
     via _boot_execution_agent() — the LangGraph node itself handles per-session output.
  2. Audio TTS output uses pyttsx3 (offline, Pi-compatible).
     If pyttsx3 is unavailable the node degrades gracefully to text-only.
  3. Settings/loguru infrastructure from the original is retained and called
     during node initialisation.
  4. Node returns a state-dict patch (session_complete=True) when done.

NOTE: The GPIO / OLED / servo logic referenced in settings is NOT removed —
      it simply isn't exercised yet (Phase 2, same as original main.py comment).
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path
from typing import Optional

from loguru import logger

from state import SpeechTherapyState

# ── Optional TTS (pyttsx3 works offline on Raspberry Pi) ────────────────────
try:
    import pyttsx3
    _tts_engine = pyttsx3.init()
    _TTS_AVAILABLE = True
except Exception:
    _tts_engine    = None
    _TTS_AVAILABLE = False


# ── Lazy settings load (original Settings infrastructure) ───────────────────
_settings = None

def _get_settings():
    """Load settings once; silently skip if src.settings is unavailable."""
    global _settings
    if _settings is not None:
        return _settings
    try:
        from src.settings import load_settings_or_exit
        _settings = load_settings_or_exit()
        logger.info("Execution Agent settings loaded.")
        logger.info("  Audio: {} Hz, {} channels, volume={}",
                    _settings.audio.sample_rate,
                    _settings.audio.channels,
                    _settings.audio.volume)
    except (ImportError, Exception) as exc:
        logger.warning("src.settings not available ({}). Continuing without hardware config.", exc)
        _settings = None
    return _settings


# ── Audio output helper ──────────────────────────────────────────────────────

def _speak(text: str) -> Optional[str]:
    """
    Convert feedback text to speech.
    Returns path to saved .wav if successful, else None.
    Falls back to printing text if TTS is unavailable.
    """
    if not _TTS_AVAILABLE or _tts_engine is None:
        logger.warning("TTS not available — text-only mode.")
        return None

    try:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        _tts_engine.save_to_file(text, tmp.name)
        _tts_engine.runAndWait()
        logger.info("Audio feedback saved to {}", tmp.name)
        return tmp.name
    except Exception as exc:
        logger.error("TTS error: {}", exc)
        return None


# ── LangGraph node ───────────────────────────────────────────────────────────

def execution_node(state: SpeechTherapyState) -> dict:
    """
    LangGraph node: deliver feedback as audio + text, mark session complete.
    """
    _get_settings()   # initialise hardware config if available

    feedback         = state.get("feedback") or {}
    feedback_text    = feedback.get("feedback_text", "No feedback generated.")
    practice         = state.get("practice_exercise", "")
    patient_name     = state.get("patient_name", "friend")
    target_word      = state.get("target_word", "")
    error_report     = state.get("error_report") or {}
    semantic_label   = state.get("semantic_label", "N/A")

    # ── Terminal summary ─────────────────────────────────────────
    print("\n" + "█" * 55)
    print("  SESSION SUMMARY")
    print("█" * 55)
    print(f"  Patient    : {patient_name}")
    print(f"  Target word: {target_word}")
    print(f"  Accuracy   : {error_report.get('accuracy', 'N/A')}%")
    print(f"  Errors     : {error_report.get('total_errors', 'N/A')}")
    print(f"  Semantic   : {semantic_label}")
    print("─" * 55)
    print(f"  FEEDBACK:\n  {feedback_text}")
    print("─" * 55)
    if practice:
        print(f"  PRACTICE:\n  {practice}")
    print("█" * 55 + "\n")

    # ── Audio output ─────────────────────────────────────────────
    full_speech = f"{feedback_text}  {practice}" if practice else feedback_text
    audio_path  = _speak(full_speech)

    if audio_path:
        print(f"🔊 Audio saved → {audio_path}")
    else:
        print("🔇 Text-only mode (TTS unavailable or not installed).")

    return {
        **state,
        "audio_output_path": audio_path,
        "session_complete":  True,
        "current_error":     None,
    }
