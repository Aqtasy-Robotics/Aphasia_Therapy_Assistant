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
