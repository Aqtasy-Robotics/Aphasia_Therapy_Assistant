"""
nodes/execution_node.py — Output delivery wrapped as a LangGraph node.

UPDATED FOR PI → LAPTOP ARCHITECTURE:
- When ROBOT_REMOTE_MODE=1, TTS audio is generated and saved to a temp WAV
  but NOT played on the laptop speaker. The laptop_server reads audio_output_path
  from the final state and streams the WAV back to the Pi, which plays it.
- When running locally (no env var), original behaviour is preserved:
  generate + play on laptop speaker.

TTS pipeline (in order):
  1. Piper TTS (ONNX) — set PIPER_MODEL_PATH to the .onnx file.
  2. pyttsx3 — fallback if Piper is unavailable.
  3. Terminal print — last resort.
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from agentic.db.mem0_store import add_session_memory
from agentic.state import SpeechTherapyState

# ── Remote mode flag ──────────────────────────────────────────────────────────
# When True: generate TTS audio and save it, but do NOT play on laptop speaker.
# The file path is returned in audio_output_path; laptop_server sends it to Pi.
_REMOTE_MODE: bool = os.getenv("ROBOT_REMOTE_MODE", "0").lower() in ("1", "true", "yes")

# ── Piper (primary TTS) ───────────────────────────────────────────────────────
try:
    try:
        from piper import PiperVoice
    except ImportError:
        from piper_tts import PiperVoice  # type: ignore[no-redef]
    _PIPER_AVAILABLE = True
except Exception:
    PiperVoice = None  # type: ignore[misc, assignment]
    _PIPER_AVAILABLE = False

try:
    import numpy as np
    _NP_AVAILABLE = True
except Exception:
    _NP_AVAILABLE = False

# ── pyttsx3 fallback ──────────────────────────────────────────────────────────
try:
    import pyttsx3
    _PYTTSX3_AVAILABLE = True
except Exception:
    _PYTTSX3_AVAILABLE = False

# ── sounddevice (local playback only) ────────────────────────────────────────
try:
    import sounddevice as sd
    _SD_AVAILABLE = True
except Exception:
    _SD_AVAILABLE = False


# ── Lazy settings / Piper cache ───────────────────────────────────────────────
_settings = None
_piper_exec_voice: Any = None
_piper_exec_model_key: Optional[str] = None


def _get_failure_reason_message(reason: str | None, target_word: str = "") -> str:
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
    global _settings
    if _settings is not None:
        return _settings
    try:
        from src.settings import load_settings_or_exit
        _settings = load_settings_or_exit()
        logger.info("Execution Agent settings loaded.")
    except (ImportError, Exception) as exc:
        logger.warning("src.settings not available ({}). Continuing without hardware config.", exc)
        _settings = None
    return _settings


# ── Local speaker discovery (used only when not in remote mode) ───────────────

def _find_laptop_speaker() -> Optional[int]:
    if not _SD_AVAILABLE:
        return None
    devices = sd.query_devices()
    for idx, d in enumerate(devices):
        if d["name"].strip().lower() == "default" and d["max_output_channels"] >= 1:
            return idx
    try:
        default = sd.query_devices(kind="output")
        for idx, d in enumerate(devices):
            if d["name"] == default["name"] and d["max_output_channels"] >= 1:
                return idx
    except Exception:
        pass
    for idx, d in enumerate(devices):
        if d["max_output_channels"] >= 1:
            return idx
    return None


def _read_piper_sample_rate(model_path: Path) -> int:
    cfg = model_path.with_suffix(".onnx.json")
    try:
        with cfg.open(encoding="utf-8") as fh:
            data = json.load(fh)
        return int(data.get("audio", {}).get("sample_rate", 22050))
    except Exception:
        return 22050


def _piper_model_path() -> Optional[Path]:
    s = _get_settings()
    if s is not None:
        raw = getattr(s, "piper_model_path", None)
        if raw is not None:
            p = Path(str(raw)).expanduser()
            if p.is_file():
                return p
    env_p = (os.getenv("PIPER_MODEL_PATH") or "").strip()
    if env_p:
        p = Path(env_p).expanduser()
        if p.is_file():
            return p
    return None


def _playback_volume() -> float:
    s = _get_settings()
    if s is not None:
        try:
            return float(max(0.0, min(1.0, float(s.audio.volume))))
        except (TypeError, ValueError):
            pass
    return 0.9


def _resolve_playback_device() -> Optional[int]:
    s = _get_settings()
    if s is not None and getattr(s.audio, "output_device", None):
        try:
            from src.services.audio_utils import select_output_device
            return int(select_output_device(s.audio.output_device))
        except Exception as exc:
            logger.debug("[execution_node] select_output_device skipped: {}", exc)
    return _find_laptop_speaker()


def _load_piper_voice(model_path: Path) -> Any:
    global _piper_exec_voice, _piper_exec_model_key
    if not _PIPER_AVAILABLE or PiperVoice is None:
        raise RuntimeError("piper-tts not installed")
    key = str(model_path.resolve())
    if _piper_exec_voice is not None and _piper_exec_model_key == key:
        return _piper_exec_voice
    config_path = model_path.with_suffix(".onnx.json")
    if not config_path.is_file():
        raise FileNotFoundError(f"Piper config missing: {config_path}")
    logger.info("[execution_node] Loading Piper model from {}", model_path)
    _piper_exec_voice = PiperVoice.load(str(model_path), config_path=str(config_path))
    _piper_exec_model_key = key
    return _piper_exec_voice


def _synthesize_piper_numpy(text: str, voice: Any) -> Any:
    if not _NP_AVAILABLE:
        raise RuntimeError("numpy required for Piper output")
    chunks: list[Any] = []
    for audio_bytes in voice.synthesize(text):
        audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
        chunks.append(audio_int16.astype(np.float32) / 32768.0)
    if not chunks:
        raise ValueError("Piper produced no audio")
    audio_array = np.concatenate(chunks)
    if len(audio_array.shape) > 1:
        audio_array = np.mean(audio_array, axis=1)
    return audio_array


def _speak_piper(text: str) -> Optional[str]:
    """
    Generate TTS with Piper and save to WAV.
    Plays on laptop speaker only when NOT in remote mode.
    Returns WAV path on success, None on failure.
    """
    if not _PIPER_AVAILABLE or not _NP_AVAILABLE:
        return None
    model_path = _piper_model_path()
    if model_path is None:
        logger.info("[execution_node] Piper skipped — set PIPER_MODEL_PATH.")
        return None

    wav_path: Optional[str] = None
    try:
        voice       = _load_piper_voice(model_path)
        audio       = _synthesize_piper_numpy(text, voice)
        sample_rate = _read_piper_sample_rate(model_path)
        vol         = _playback_volume()
        audio       = np.clip(audio * vol, -1.0, 1.0)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        wav_path = tmp.name

        import soundfile as sf
        sf.write(wav_path, audio, sample_rate, subtype="PCM_16")
        logger.info("[execution_node] Piper TTS saved → {}", wav_path)

        # ── Only play locally when not in remote mode ─────────────
        if _REMOTE_MODE:
            logger.info("[execution_node] Remote mode — skipping local playback, Pi will play.")
        elif _SD_AVAILABLE:
            out_dev = _resolve_playback_device()
            if out_dev is not None:
                sd.play(audio, samplerate=sample_rate, device=out_dev)
                sd.wait()
                logger.info("[execution_node] Piper playback complete on laptop.")
            else:
                logger.warning("[execution_node] No output device — WAV saved but not played locally.")
        # ─────────────────────────────────────────────────────────

        return wav_path

    except Exception as exc:
        logger.warning("[execution_node] Piper TTS failed ({}); trying pyttsx3.", exc)
        return None


def _speak_pyttsx3(text: str) -> Optional[str]:
    """
    Generate TTS with pyttsx3 and save to WAV.
    Plays on laptop speaker only when NOT in remote mode.
    Returns WAV path on success, None on failure.
    """
    if not _PYTTSX3_AVAILABLE:
        return None

    engine   = None
    wav_path: Optional[str] = None

    try:
        import pyttsx3 as _ptts

        engine = _ptts.init()
        tmp    = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        wav_path = tmp.name

        engine.save_to_file(text, wav_path)
        engine.runAndWait()
        logger.info("[execution_node] pyttsx3 TTS saved → {}", wav_path)

        # ── Only play locally when not in remote mode ─────────────
        if _REMOTE_MODE:
            logger.info("[execution_node] Remote mode — skipping local playback, Pi will play.")
        elif _SD_AVAILABLE:
            output_device = _find_laptop_speaker()
            if output_device is not None:
                import soundfile as sf
                data, sample_rate = sf.read(wav_path, dtype="float32")
                sd.play(data, samplerate=sample_rate, device=output_device)
                sd.wait()
            else:
                engine2 = _ptts.init()
                engine2.say(text)
                engine2.runAndWait()
                try:
                    engine2.stop()
                except Exception:
                    pass
        # ─────────────────────────────────────────────────────────

        return wav_path

    except Exception as exc:
        logger.error("[execution_node] pyttsx3 error: {}", exc)
        return wav_path
    finally:
        if engine is not None:
            try:
                engine.stop()
            except Exception:
                pass


def _speak(text: str) -> Optional[str]:
    """
    Piper (preferred) → pyttsx3 → terminal print.
    In remote mode: generates + saves WAV, returns path (no local playback).
    In local mode: generates + saves + plays WAV, returns path.
    Returns path to saved .wav, or None if all synthesis failed.
    """
    path = _speak_piper(text)
    if path:
        return path
    path = _speak_pyttsx3(text)
    if path:
        return path
    logger.warning("[execution_node] No TTS backend — printing feedback only.")
    print(f"\n[TTS fallback] {text}\n")
    return None


# ── LangGraph node ────────────────────────────────────────────────────────────

def execution_node(state: SpeechTherapyState) -> dict:
    """
    LangGraph node: deliver feedback as audio + text, mark session complete.

    Remote mode (ROBOT_REMOTE_MODE=1):
      - Generates TTS WAV and saves to audio_output_path.
      - Does NOT play on laptop speaker.
      - laptop_server.py reads audio_output_path and streams WAV back to Pi.

    Local mode:
      - Generates TTS WAV, plays on laptop speaker, saves to audio_output_path.
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

    # ── Terminal summary ──────────────────────────────────────────
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
    print(f"  MODE: {'remote (Pi will play audio)' if _REMOTE_MODE else 'local (playing on laptop)'}")
    print("█" * 55 + "\n")

    # ── TTS: generate WAV (+ play locally if not remote) ─────────
    full_speech = f"{feedback_text}  {practice}" if practice else feedback_text
    audio_path  = _speak(full_speech)

    if audio_path:
        if _REMOTE_MODE:
            print(f"🔊 TTS WAV ready for Pi → {audio_path}")
        else:
            print(f"🔊 Audio saved + played locally → {audio_path}")
    else:
        print("🔇 Text-only mode (set PIPER_MODEL_PATH or install pyttsx3).")

    # ── Session history ───────────────────────────────────────────
    history = list(state.get("session_history") or [])
    history.append({
        "target_word":       target_word,
        "transcript":        transcript,
        "accuracy":          error_report.get("accuracy", 0),
        "total_errors":      error_report.get("total_errors", 0),
        "substitutions":     error_summary.get("substitutions", 0),
        "omissions":         error_summary.get("omissions", 0),
        "insertions":        error_summary.get("insertions", 0),
        "semantic_label":    semantic_label,
        "target_phonemes":   target_phonemes,
        "attempt_phonemes":  attempt_phonemes,
        "feedback_text":     feedback_text,
        "practice_exercise": practice,
        "model_used":        feedback.get("model_used"),
    })

    stored_in_mem0 = add_session_memory(
        patient_id=state.get("patient_id"),
        payload={
            "patient_name":         patient_name,
            "target_word":          target_word,
            "transcript":           transcript,
            "accuracy":             error_report.get("accuracy", 0),
            "total_errors":         error_report.get("total_errors", 0),
            "substitutions":        error_summary.get("substitutions", 0),
            "omissions":            error_summary.get("omissions", 0),
            "insertions":           error_summary.get("insertions", 0),
            "semantic_label":       semantic_label,
            "feedback_text":        feedback_text,
            "practice_exercise":    practice,
            "therapy_goals":        state.get("therapy_goals") or [],
            "phonemes_to_focus_on": state.get("phonemes_to_focus_on") or [],
            "difficulty_level":     state.get("difficulty_level") or "medium",
        },
    )
    mem0_error: Optional[str] = None
    if stored_in_mem0:
        logger.info("Stored session memory in Mem0 for patient {} word '{}'", patient_name, target_word)
    else:
        mem0_error = "Mem0 session memory was not stored for this attempt."
        logger.warning(mem0_error)

    # ── Fatigue update ────────────────────────────────────────────
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
        f"[execution] Fatigue: {current_fatigue} → {next_fatigue_level} "
        f"(Δ{fatigue_delta:+d}, accuracy={accuracy:.1f}%, retries={retries}, trend='{trend or 'unknown'}')"
    )

    # ── Advance to next word or mark session complete ─────────────
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
        "audio_output_path":     audio_path,   # server reads this and sends to Pi
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