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
    transcript_attempts: Optional[List[Dict[str, Any]]]  # all perception attempts across session (for audit/debug)

    # ── Session meta (collected once at start) ──────────────────
    session_type:       Optional[str]        # 'word_level' | 'sentence_level'
    target_word:        Optional[str]        # word patient should say
    target_words:       Optional[List[str]]  # ordered target words loaded from sessions.target_words
    target_sentence:    Optional[str]        # sentence patient should say (sentence_level mode)
    target_items:       Optional[List[str]]  # unified ordered targets for active mode (target_words or [target_sentence])
    current_target_index: int                # current index in target_items
    has_more_target_words: bool              # legacy flag: True when there is another target item
    patient_name:       str                  # for personalised feedback
    therapy_goals:      Optional[List[str]]  # therapist-defined goals from portal/session config
    phonemes_to_focus_on: Optional[List[str]]  # prioritized phonemes to emphasize in guidance
    phonemes_to_focus: Optional[List[str]]  # legacy alias accepted from older payloads
    difficulty_level:   Optional[str]        # expected difficulty: easy | medium | hard

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
    word_source:            Optional[str]    # 'therapist' | 'patient_category' | 'sessions_table'
    session_start:          Optional[float]  # time.time() at session start
    session_duration_secs:  Optional[int]
   
    # ── Report ───────────────────────────────────────────────────
    report_id:              Optional[str]    # Supabase session_reports.id
    # ── Execution ───────────────────────────────────────────────
    audio_output_path:  Optional[str]        # path to any generated TTS audio output file
    session_complete:   bool                 # flag indicating whether the logical session has finished
    session_outcome:    Optional[str]        # 'success' | 'hard_stop' | 'escalate_to_human' to classify how the session ended
    fatigue_level:      Optional[int]        # simple 0–10 indicator of how fatigued the patient is

    # ── Control / error propagation ─────────────────────────────
    current_error:      Annotated[Optional[str], _merge_current_error]  # merge helper prefers newer non-empty error messages
    failure_reason:     Optional[str]                             # silence | noise | non_english | error from recent perception failures

    # ── History / progress ──────────────────────────────────────
    session_history:    Optional[List[Dict[str, Any]]]            # list of past session summaries for this patient
    memory_context:     Optional[List[Dict[str, Any]]]            # relevant prior session memories fetched from Mem0
    patient_trend:      Optional[str]                             # 'improving' | 'needs work' trend derived from history
    sessions_done:      int                                       # how many sessions have been completed so far