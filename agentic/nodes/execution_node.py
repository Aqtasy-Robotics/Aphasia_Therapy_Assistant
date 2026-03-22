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
import time
from pathlib import Path
from typing import Optional

from loguru import logger

from agentic.db.mem0_store import add_session_memory
from agentic.state import SpeechTherapyState

# ── Optional TTS imports ─────────────────────────────────────────────────────
# Primary:  pyttsx3  — offline, works on Raspberry Pi and laptop
# Fallback: just print to terminal
try:
    import pyttsx3
    _TTS_AVAILABLE = True
except Exception:
    _TTS_AVAILABLE = False

# sounddevice is used to enumerate the default output device (laptop speaker)
try:
    import sounddevice as sd
    _SD_AVAILABLE = True
except Exception:
    _SD_AVAILABLE = False


# ── Lazy settings load ───────────────────────────────────────────────────────
_settings = None


def _get_failure_reason_message(reason: str | None, target_word: str = "") -> str:
    """Return a targeted prompt for the previous failed recording attempt."""
    word = (target_word or "").strip()
    if reason == "silence":
        return "I could not hear you clearly. Please speak a bit louder and say the word clearly."
    if reason == "noise":
        return "There was too much background noise. Please move to a quiet place and try again."
    if reason == "non_english":
        if word:
            return f"Please say the target word '{word}' in English. Let us try again."
        return "Please say the target word in English. Let us try again."
    if reason == "error":
        return "There was a recording issue. Please try speaking again."
    return ""


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


# ── Laptop speaker discovery ─────────────────────────────────────────────────

def _find_laptop_speaker() -> Optional[int]:
    """
    Return the index of the laptop's default output device.

    On this machine (Ubuntu/pipewire):
      [11] default  — pipewire virtual device that routes to the
                      built-in laptop speaker (ALC257 Analog).
    
    Strategy:
      1. Look for a device literally named 'default' — this is
         pipewire's catch-all on Linux and always routes correctly.
      2. Fall back to the OS-reported default output device.
      3. Last resort: first device with output channels.
    """
    if not _SD_AVAILABLE:
        return None

    devices = sd.query_devices()

    # Pass 1 — device literally named "default" (pipewire on Linux)
    for idx, d in enumerate(devices):
        if d["name"].strip().lower() == "default" and d["max_output_channels"] >= 1:
            logger.info(
                "[execution_node] Using 'default' pipewire device [{}]: {!r}",
                idx, d["name"],
            )
            return idx

    # Pass 2 — OS-reported default output
    try:
        default = sd.query_devices(kind="output")
        for idx, d in enumerate(devices):
            if d["name"] == default["name"] and d["max_output_channels"] >= 1:
                logger.info(
                    "[execution_node] Using OS default output device [{}]: {!r}",
                    idx, d["name"],
                )
                return idx
    except Exception:
        pass

    # Pass 3 — first available output device
    for idx, d in enumerate(devices):
        if d["max_output_channels"] >= 1:
            logger.info(
                "[execution_node] Fallback output device [{}]: {!r}",
                idx, d["name"],
            )
            return idx

    return None

# ── Audio output helper ──────────────────────────────────────────────────────

def _speak(text: str) -> Optional[str]:
    """
    Convert feedback text to speech and play it through the laptop speaker.

    Steps:
      1. Resolve the laptop's default output device index via sounddevice.
      2. Initialise a fresh pyttsx3 engine, save speech to a temp .wav file.
      3. Play the .wav back through the resolved output device using
         sounddevice + soundfile (same stack used by perception_node for input).
      4. If anything fails, fall back to pyttsx3's own runAndWait() playback
         (which uses the OS default speaker anyway).
      5. If pyttsx3 is entirely unavailable, print the text to terminal.

    Returns the path to the saved .wav on success, else None.
    """
    if not _TTS_AVAILABLE:
        logger.warning("pyttsx3 not available — printing feedback to terminal only.")
        print(f"\n[TTS fallback] {text}\n")
        return None

    engine = None
    wav_path: Optional[str] = None

    try:
        # Step 1 — find the laptop speaker
        output_device = _find_laptop_speaker()

        # Step 2 — synthesise speech to a temp .wav
        engine = pyttsx3.init()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        wav_path = tmp.name
        engine.save_to_file(text, wav_path)
        engine.runAndWait()   # writes the file; does NOT play yet
        logger.info("[execution_node] TTS audio saved → {}", wav_path)

        # Step 3 — play through the laptop speaker via sounddevice
        if _SD_AVAILABLE and output_device is not None:
            import soundfile as sf
            data, sample_rate = sf.read(wav_path, dtype="float32")
            logger.info(
                "[execution_node] Playing audio on device [{}] at {} Hz",
                output_device, sample_rate,
            )
            sd.play(data, samplerate=sample_rate, device=output_device)
            sd.wait()   # block until playback finishes
            logger.info("[execution_node] Playback complete.")
        else:
            # Step 4 — sounddevice unavailable; let pyttsx3 play via OS default
            logger.warning(
                "[execution_node] sounddevice unavailable — "
                "falling back to pyttsx3 default playback."
            )
            engine2 = pyttsx3.init()
            engine2.say(text)
            engine2.runAndWait()
            try:
                engine2.stop()
            except Exception:
                pass

        return wav_path

    except Exception as exc:
        logger.error("[execution_node] TTS/playback error: {}", exc)
        # Last resort — print to terminal so feedback is never lost
        print(f"\n[TTS fallback] {text}\n")
        return wav_path   # still return the path if the file was written
    finally:
        if engine is not None:
            try:
                engine.stop()
            except Exception:
                pass


# ── LangGraph node ───────────────────────────────────────────────────────────

def execution_node(state: SpeechTherapyState) -> dict:
    """
    LangGraph node: deliver feedback as audio + text, mark session complete.
    """
    _get_settings()

    feedback         = state.get("feedback") or {}
    feedback_text    = feedback.get("feedback_text", "No feedback generated.")
    practice         = state.get("practice_exercise", "")
    patient_name     = state.get("patient_name", "friend")
    target_word      = state.get("target_word", "")
    error_report     = state.get("error_report") or {}
    error_summary    = error_report.get("error_summary") or {}
    semantic_label   = state.get("semantic_label", "N/A")
    target_phonemes  = state.get("target_phonemes") or []
    attempt_phonemes = state.get("attempt_phonemes") or []
    target_words     = state.get("target_words") or []
    current_index    = int(state.get("current_target_index", 0) or 0)
    transcript       = state.get("transcript", "")

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

    # ── Audio output through laptop speaker ──────────────────────
    full_speech = f"{feedback_text}  {practice}" if practice else feedback_text
    audio_path  = _speak(full_speech)

    if audio_path:
        print(f"🔊 Audio saved → {audio_path}")
    else:
        print("🔇 Text-only mode (TTS unavailable or not installed).")

    history = list(state.get("session_history") or [])
    history.append(
        {
            "target_word":      target_word,
            "transcript":       transcript,
            "accuracy":         error_report.get("accuracy", 0),
            "total_errors":     error_report.get("total_errors", 0),
            "substitutions":    error_summary.get("substitutions", 0),
            "omissions":        error_summary.get("omissions", 0),
            "insertions":       error_summary.get("insertions", 0),
            "semantic_label":   semantic_label,
            "target_phonemes":  target_phonemes,
            "attempt_phonemes": attempt_phonemes,
            "feedback_text":    feedback_text,
            "practice_exercise": practice,
            "model_used":       feedback.get("model_used"),
        }
    )

    stored_in_mem0 = add_session_memory(
        patient_id=state.get("patient_id"),
        payload={
            "patient_name":        patient_name,
            "target_word":         target_word,
            "transcript":          transcript,
            "accuracy":            error_report.get("accuracy", 0),
            "total_errors":        error_report.get("total_errors", 0),
            "substitutions":       error_summary.get("substitutions", 0),
            "omissions":           error_summary.get("omissions", 0),
            "insertions":          error_summary.get("insertions", 0),
            "semantic_label":      semantic_label,
            "feedback_text":       feedback_text,
            "practice_exercise":   practice,
            "therapy_goals":       state.get("therapy_goals") or [],
            "phonemes_to_focus_on": state.get("phonemes_to_focus_on") or [],
            "difficulty_level":    state.get("difficulty_level") or "medium",
        },
    )
    mem0_error: Optional[str] = None
    if stored_in_mem0:
        logger.info("Stored session memory in Mem0 for patient {} and word '{}'", patient_name, target_word)
    else:
        mem0_error = "Mem0 session memory was not stored for this attempt."
        logger.warning(mem0_error)

    # ── Fatigue update ───────────────────────────────────────────
    current_fatigue = int(state.get("fatigue_level", 0) or 0)
    trend           = str(state.get("patient_trend") or "").strip().lower()
    retries         = int(state.get("retry_count", 0) or 0)
    try:
        accuracy = float(error_report.get("accuracy", 0) or 0)
    except (TypeError, ValueError):
        accuracy = 0.0

    fatigue_delta = 1
    if accuracy < 70:
        fatigue_delta += 2
    if retries >= 2:
        fatigue_delta += 1
    if trend == "needs work":
        fatigue_delta += 1
    elif trend == "improving" and accuracy >= 90:
        fatigue_delta -= 1

    next_fatigue_level = max(0, min(10, current_fatigue + fatigue_delta))
    print(
        f"[execution] Fatigue update: {current_fatigue} -> {next_fatigue_level} "
        f"(delta {fatigue_delta:+d}, accuracy={accuracy:.1f}, retries={retries}, trend='{trend or 'unknown'}')"
    )

    # ── Advance to next word or mark complete ────────────────────
    next_index            = current_index
    next_target_word      = target_word
    has_more_target_words = False
    next_retry_count      = state.get("retry_count", 0)
    next_feedback_attempts = state.get("feedback_attempts", 0)

    if isinstance(target_words, list) and target_words and current_index + 1 < len(target_words):
        next_index             = current_index + 1
        next_target_word       = str(target_words[next_index]).strip()
        has_more_target_words  = True
        next_retry_count       = 0
        next_feedback_attempts = 0
        print(f"➡️  Next target word: '{next_target_word}'")
    else:
        print("✅ All target words completed.")

    duration = state.get("session_duration_secs")
    if duration is None and state.get("session_start") is not None:
        try:
            duration = int(max(0, time.time() - float(state.get("session_start") or 0)))
        except Exception:
            duration = None

    return {
        "audio_output_path":     audio_path,
        "session_complete":      not has_more_target_words,
        "target_word":           next_target_word,
        "current_target_index":  next_index,
        "has_more_target_words": has_more_target_words,
        "retry_count":           next_retry_count,
        "feedback_attempts":     next_feedback_attempts,
        "transcript":            None if has_more_target_words else transcript,
        "confidence_score":      None if has_more_target_words else state.get("confidence_score"),
        "target_phonemes":       None if has_more_target_words else state.get("target_phonemes"),
        "attempt_phonemes":      None if has_more_target_words else state.get("attempt_phonemes"),
        "error_report":          None if has_more_target_words else state.get("error_report"),
        "semantic_label":        None if has_more_target_words else state.get("semantic_label"),
        "feedback":              None if has_more_target_words else state.get("feedback"),
        "practice_exercise":     None if has_more_target_words else state.get("practice_exercise"),
        "memory_context":        [] if has_more_target_words else state.get("memory_context", []),
        "session_history":       history,
        "fatigue_level":         next_fatigue_level,
        "session_duration_secs": duration,
        "report_id":             state.get("report_id"),
        "current_error":         mem0_error,
    }