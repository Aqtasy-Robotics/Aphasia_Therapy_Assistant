"""
edges.py — Updated conditional routing.

Changes from original:
  - check_feedback_quality now reads feedback_scores from evaluator_node
    instead of just checking text length. Proper LLM-based quality gate.
  - All other edges unchanged.
"""

from __future__ import annotations  # enable postponed evaluation of annotations
from state import SpeechTherapyState  # shared TypedDict used by all routing helpers

CONFIDENCE_THRESHOLD = -1.0  # minimum acceptable confidence score from the transcription step
MAX_RECORD_RETRIES   = 2     # how many times we are willing to re-record audio
MAX_FEEDBACK_RETRIES = 3     # how many times we retry generating feedback before escalating
MIN_SCORE_TO_PASS    = 3     # evaluator scores must all be >= this for feedback to be accepted


def check_transcription_quality(state: SpeechTherapyState) -> str:
    """Route after perception based on transcript confidence and retries.

    Returns one of:
      - "re_record"        → loop back to perception for another attempt
      - "analyze_phonemes" → proceed with phoneme analysis
      - "therapist_review" → escalate to human after too many failed attempts
    """
    confidence  = state.get("confidence_score", 0.0) or 0.0  # numeric confidence proxy from perception_node
    retry_count = state.get("retry_count", 0)                # how many times the user has already re-recorded
    transcript  = state.get("transcript", "") or ""         # transcribed text from Whisper

    # If we already retried too many times, escalate to a human instead of forcing progress.
    if retry_count >= MAX_RECORD_RETRIES:
        print(f"[router] Max retries ({MAX_RECORD_RETRIES}) reached — escalating to therapist review.")
        return "therapist_review"  # new path that will go to therapist_review_node

    # If we got nothing back, ask the user to speak again.
    if not transcript.strip():
        print("[router] Empty transcript — re-recording...")
        return "re_record"  # stay in the perception node

    # If the confidence is below threshold, request another recording.
    if confidence < CONFIDENCE_THRESHOLD:
        print(f"[router] Low confidence ({confidence:.2f}) — re-recording...")
        return "re_record"  # stay in the perception node

    # Otherwise, the transcript looks good enough to move forward.
    print(f"[router] Transcription OK — proceeding.")
    return "analyze_phonemes"  # continue to phoneme_analysis


def route_by_error_type(state: SpeechTherapyState) -> str:
    """Route based on phoneme / semantic error types.

    Returns one of:
      - "deep_feedback"     → more detailed feedback path
      - "standard_feedback" → normal feedback path
    """
    semantic_label = state.get("semantic_label", "") or ""  # high-level label such as "Neologistic"
    error_types    = [e["type"] for e in (state.get("error_report") or {}).get("errors", [])]  # list of error type strings

    # If we explicitly detected Neologistic paraphasia, take the deep feedback path.
    if semantic_label == "Neologistic":
        print("[router] Neologistic error → deep feedback path.")
        return "deep_feedback"  # choose the deep feedback branch

    # Otherwise, treat all other mixtures of error types as standard feedback.
    print(f"[router] Error types: {set(error_types)} → standard feedback path.")
    return "standard_feedback"  # choose the standard feedback branch


def check_feedback_quality(state: SpeechTherapyState) -> str:
    """Route after feedback generation using evaluator scores or length.

    Returns one of:
      - "retry_feedback"    → try to regenerate better feedback
      - "execute"           → move on to execution (deliver feedback)
      - "therapist_review"  → escalate to human after too many failed attempts
    """
    feedback_attempts = state.get("feedback_attempts", 0)         # how many times feedback has already been regenerated
    scores            = state.get("feedback_scores") or {}         # evaluator_node scores, if present

    # If we have already retried feedback too many times, escalate instead of forcing execution.
    if feedback_attempts >= MAX_FEEDBACK_RETRIES:
        print(f"[router] Max retries ({MAX_FEEDBACK_RETRIES}) — escalating to therapist review.")
        return "therapist_review"  # new path that will go to therapist_review_node

    # ── Use evaluator scores if available ───────────────────────
    if scores:
        simp = scores.get("simplicity", 5)  # score for how simple the feedback is
        emp  = scores.get("empathy",    5)  # score for how empathetic the feedback is
        act  = scores.get("actionable", 5)  # score for how actionable / practical the feedback is
        # If any score is below threshold, request a retry.
        if min(simp, emp, act) < MIN_SCORE_TO_PASS:
            print(f"[router] Feedback failed eval (s={simp} e={emp} a={act}) — retrying...")
            return "retry_feedback"  # go back to feedback_generation
        # Otherwise, all scores passed, so continue to execution.
        print(f"[router] Feedback passed eval (s={simp} e={emp} a={act}) — executing.")
        return "execute"  # proceed to execution

    # ── Fallback: length check (before first eval runs) ─────────
    feedback_text = (state.get("feedback") or {}).get("feedback_text", "") or ""  # raw feedback text if scores are missing
    if len(feedback_text.strip()) < 40:
        print(f"[router] Feedback too short — retrying...")
        return "retry_feedback"  # feedback is too short to be useful, try again

    # With no scores and acceptable length, allow execution to proceed.
    return "execute"  # default path when fallback checks pass


def route_after_execution(state: SpeechTherapyState) -> str:
    """Decide what to do after executing feedback for the current word.

    Returns one of:
      - "continue_session"  → continue with another word at current difficulty
      - "adjust_difficulty" → change difficulty / word selection then continue
      - "success"           → end session successfully
      - "hard_stop"         → end session early due to fatigue or other reasons
    """
    has_more_target_words = bool(state.get("has_more_target_words", False))

    if has_more_target_words:
        print("[router] Moving to next target word from sessions.target_words.")
        return "continue_session"

    print("[router] Target word array completed — ending with SUCCESS.")
    return "success"