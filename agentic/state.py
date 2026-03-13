"""
state.py — Shared LangGraph State
All nodes read from and write back to this single TypedDict.
"""

from __future__ import annotations
from typing import TypedDict, Optional, List, Dict, Any, Annotated


def _merge_current_error(current: Optional[str], new: Optional[str]) -> Optional[str]:
    """Prefer a new non-empty error message, otherwise keep the existing value."""
    return new or current


class SpeechTherapyState(TypedDict):
    # ── Perception ──────────────────────────────────────────────
    audio_path:         Optional[str]        # temp .wav file path
    transcript:         Optional[str]        # whisper output
    confidence_score:   Optional[float]      # avg_logprob from whisper
    retry_count:        int                  # how many re-record attempts

    # ── Session meta (collected once at start) ──────────────────
    target_word:        Optional[str]        # word patient should say
    patient_name:       str                  # for personalised feedback

    # ── Phoneme Analysis ────────────────────────────────────────
    target_phonemes:    Optional[List[str]]
    attempt_phonemes:   Optional[List[str]]
    error_report:       Optional[Dict[str, Any]]   # full report from analyser
    semantic_label:     Optional[str]              # Neologistic / Semantic Paraphasia / etc.

    # ── Feedback Generation ─────────────────────────────────────
    feedback:           Optional[Dict[str, Any]]   # full feedback dict from Groq
    practice_exercise:  Optional[str]
    feedback_attempts:  int

    # ── Session identity ─────────────────────────────────────────
    patient_id:             Optional[str]    # Supabase patients.id
    assignment_id:          Optional[str]    # Supabase therapist_assignments.id
    word_source:            Optional[str]    # 'therapist' | 'patient_category'
    session_start:          Optional[float]  # time.time() at session start
    session_duration_secs:  Optional[int]
   
    # ── Report ───────────────────────────────────────────────────
    report_id:              Optional[str]    # Supabase session_reports.id
    # ── Execution ───────────────────────────────────────────────
    audio_output_path:  Optional[str]
    session_complete:   bool  # true or not

    # ── Control / error propagation ─────────────────────────────
    current_error:      Annotated[Optional[str], _merge_current_error]

    # ── History / progress ──────────────────────────────────────
    session_history:    Optional[List[Dict[str, Any]]]
    patient_trend:      Optional[str]    # 'improving' | 'needs work'
    sessions_done:      int
