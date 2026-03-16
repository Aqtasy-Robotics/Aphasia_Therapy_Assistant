"""Supabase persistence helpers for the LangGraph speech therapy agent.

This module owns the connection to Supabase and exposes a single
`persist_session_state` helper that turns the final SpeechTherapyState
into a `session_reports` row.
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from supabase import Client, create_client

from state import SpeechTherapyState

# Load environment from the agentic .env (and parent env)
load_dotenv()

_SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
_SUPABASE_SERVICE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_KEY")

_supabase: Optional[Client] = None

if not _SUPABASE_URL or not _SUPABASE_SERVICE_KEY:
    print("[agentic-db] SUPABASE_URL or SUPABASE_SERVICE_KEY missing; persistence disabled.")
else:
    try:
        _supabase = create_client(_SUPABASE_URL, _SUPABASE_SERVICE_KEY)
    except Exception as exc:  # pragma: no cover - defensive guard
        _supabase = None
        print(f"[agentic-db] Failed to initialise Supabase client: {exc}")


def _get_client() -> Optional[Client]:
    """Return the shared Supabase client, or None if unavailable."""
    return _supabase


def fetch_target_word_for_patient(patient_id: str) -> Optional[str]:
    """Fetch the target word for a given patient from ``public.sessions``.

    The Supabase schema stores target words in the
    ``public.sessions.target_words`` column as an array.

    This helper:
    - Queries the ``sessions`` table for rows matching ``patient_id``.
    - Orders by ``session_date`` descending so the most recent
      session is used.
    - Returns the first non-empty string from the ``target_words``
      array, or ``None`` if it cannot be found.
    """

    if not patient_id:
        print("[agentic-db] Cannot fetch target word without a patient_id.")
        return None

    client = _get_client()
    if client is None:
        print("[agentic-db] Supabase client unavailable; cannot fetch target word.")
        return None

    try:
        response = (
            client
            .table("sessions")  # "public.sessions" schema
            .select("target_words, session_date")
            .eq("patient_id", patient_id)
            .order("session_date", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        print(f"[agentic-db] Error querying public.sessions for target word: {exc}")
        return None

    data = getattr(response, "data", None) or []
    if not data or not isinstance(data, list):
        print(f"[agentic-db] No sessions found for patient_id={patient_id} in public.sessions.")
        return None

    row = data[0] or {}
    values = row.get("target_words")

    if not isinstance(values, list) or not values:
        print(f"[agentic-db] target_words column empty or not an array for patient_id={patient_id}.")
        return None

    # Use the first non-empty string in the array.
    for v in values:
        target_str = str(v).strip()
        if target_str:
            print(f"[agentic-db] Using target word from public.sessions.target_words for patient {patient_id}: '{target_str}'")
            return target_str

    print(f"[agentic-db] No non-empty entries in target_words for patient_id={patient_id}.")
    return None


def persist_session_state(state: SpeechTherapyState) -> Optional[str]:
    """Persist the final session state into the `session_reports` table.

    NOTE: This helper expects `state["patient_id"]` to be a valid UUID
    that matches whatever `session_reports.patient_id` references in your
    schema (for you, a row in the `profiles` table). If it is missing,
    the insert is skipped.

    Returns the new report UUID as a string, or None if persistence failed.
    """

    client = _get_client()
    if client is None:
        # Already logged at initialisation time.
        return None

    patient_id: Optional[str] = state.get("patient_id")
    if not patient_id:
        print("[agentic-db] No patient_id in state; skipping session_reports insert.")
        return None

    error_report: Dict[str, Any] = state.get("error_report") or {}
    error_summary: Dict[str, Any] = error_report.get("error_summary") or {}
    feedback: Dict[str, Any] = state.get("feedback") or {}

    # Prefer an existing duration if present; otherwise derive from session_start.
    duration: Optional[int] = state.get("session_duration_secs")
    if duration is None and state.get("session_start") is not None:
        try:
            duration = int(max(0, time.time() - float(state.get("session_start") or 0)))
        except Exception:
            duration = None

    # Map SpeechTherapyState → session_reports columns.
    report: Dict[str, Any] = {
        # Required identity
        "patient_id":            patient_id,
        "assignment_id":         state.get("assignment_id"),

        # Core session info
        "target_word":           state.get("target_word"),
        "transcript":            state.get("transcript"),

        # Error metrics
        "accuracy":              error_report.get("accuracy"),
        "total_errors":          error_report.get("total_errors"),
        "substitutions":         error_summary.get("substitutions"),
        "omissions":             error_summary.get("omissions"),
        "insertions":            error_summary.get("insertions"),
        "semantic_label":        state.get("semantic_label"),

        # Feedback content
        "feedback_given":        feedback.get("feedback_text"),
        "practice_exercise":     state.get("practice_exercise"),

        # Timing / provenance
        "session_duration_secs": duration,
        "model_used":            feedback.get("model_used"),
    }

    # Drop keys whose value is None so we only send populated fields.
    clean_report = {key: value for key, value in report.items() if value is not None}

    try:
        response = client.table("session_reports").insert(clean_report).execute()
        data = getattr(response, "data", None) or []
        if data and isinstance(data, list) and data[0].get("id"):
            return str(data[0]["id"])
        print("[agentic-db] Insert did not return an id; response=", data)
        return None
    except Exception as exc:
        print(f"[agentic-db] Error inserting session_report: {exc}")
        return None