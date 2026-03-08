"""
edges.py — All conditional routing logic for the LangGraph pipeline.

Each function receives the current state and returns a string key
that LangGraph uses to pick the next node.
"""

from __future__ import annotations
from state import SpeechTherapyState

# ── Thresholds (tweak without touching node logic) ───────────────────────────
CONFIDENCE_THRESHOLD = -1.0   # avg_logprob proxy; lower = less confident
MAX_RECORD_RETRIES   = 2      # max re-record attempts before forcing forward
MAX_FEEDBACK_RETRIES = 3      # max LLM feedback retries
MIN_FEEDBACK_LENGTH  = 40     # characters; shorter = likely bad output


def check_transcription_quality(state: SpeechTherapyState) -> str:
    """
    After perception node.
    Re-record if confidence is low AND we haven't hit the retry cap.
    Also re-record if the transcript came back completely empty.
    """
    confidence  = state.get("confidence_score", 0.0) or 0.0
    retry_count = state.get("retry_count", 0)
    transcript  = state.get("transcript", "") or ""

    if retry_count >= MAX_RECORD_RETRIES:
        print(f"[router] Max retries ({MAX_RECORD_RETRIES}) reached — proceeding with current transcript.")
        return "analyze_phonemes"

    if not transcript.strip():
        print("[router] Empty transcript — re-recording...")
        return "re_record"

    if confidence < CONFIDENCE_THRESHOLD:
        print(f"[router] Low confidence ({confidence:.2f}) — re-recording (attempt {retry_count})...")
        return "re_record"

    print(f"[router] Transcription OK (confidence={confidence:.2f}) — proceeding.")
    return "analyze_phonemes"


def route_by_error_type(state: SpeechTherapyState) -> str:
    """
    After phoneme analysis node.
    Neologistic errors get a dedicated deep-feedback route;
    everything else goes to standard feedback.

    Both currently map to the same feedback_generation node —
    the node itself reads semantic_label and adjusts its prompt.
    Add a separate 'deep_analysis' node here in Phase 2 if needed.
    """
    semantic_label = state.get("semantic_label", "") or ""
    error_types    = [e["type"] for e in (state.get("error_report") or {}).get("errors", [])]

    if semantic_label == "Neologistic":
        print("[router] Neologistic error detected → deep feedback path.")
        return "deep_feedback"

    print(f"[router] Error types: {set(error_types)} → standard feedback path.")
    return "standard_feedback"


def check_feedback_quality(state: SpeechTherapyState) -> str:
    """
    After feedback generation node.
    Retry if the feedback text is suspiciously short and we're under the cap.
    """
    feedback          = state.get("feedback") or {}
    feedback_text     = feedback.get("feedback_text", "") or ""
    feedback_attempts = state.get("feedback_attempts", 0)

    if feedback_attempts >= MAX_FEEDBACK_RETRIES:
        print(f"[router] Max feedback retries ({MAX_FEEDBACK_RETRIES}) — proceeding to execution.")
        return "execute"

    if len(feedback_text.strip()) < MIN_FEEDBACK_LENGTH:
        print(f"[router] Feedback too short ({len(feedback_text)} chars) — retrying...")
        return "retry_feedback"

    print("[router] Feedback quality OK → execution.")
    return "execute"
