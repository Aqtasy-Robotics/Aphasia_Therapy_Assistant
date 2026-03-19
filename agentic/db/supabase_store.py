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
_SESSION_REPORTS_TABLE: str = os.getenv("SESSION_REPORTS_TABLE", "session_reports")

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


def fetch_patient_id_by_name(patient_name: str) -> Optional[str]:
    """Resolve a patient full name to ``public.profiles.id``.

    Rules:
    - Filters to ``role='patient'``.
    - Uses a case-insensitive match on ``full_name``.
    - If multiple rows match, returns the first row and logs a warning.
    """

    clean_name = (patient_name or "").strip()
    if not clean_name:
        print("[agentic-db] Cannot resolve patient id without a patient name.")
        return None

    client = _get_client()
    if client is None:
        print("[agentic-db] Supabase client unavailable; cannot resolve patient id.")
        return None

    try:
        response = (
            client
            .table("profiles")
            .select("id, full_name")
            .eq("role", "patient")
            .ilike("full_name", clean_name)
            .limit(5)
            .execute()
        )
    except Exception as exc:
        print(f"[agentic-db] Error querying public.profiles for patient name '{clean_name}': {exc}")
        return None

    data = getattr(response, "data", None) or []
    if not data or not isinstance(data, list):
        print(f"[agentic-db] No patient profile found for name '{clean_name}'.")
        return None

    if len(data) > 1:
        print(
            f"[agentic-db] Multiple patient profiles matched name '{clean_name}'. "
            f"Using first match with id={data[0].get('id')}."
        )

    patient_id = data[0].get("id")
    if patient_id:
        return str(patient_id)

    print(f"[agentic-db] Matched profile row missing id for name '{clean_name}'.")
    return None


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

    words = fetch_target_words_for_patient(patient_id)
    if not words:
        return None
    return words[0]


def fetch_target_words_for_patient(patient_id: str) -> list[str]:
    """Fetch and clean all target words from the latest ``public.sessions`` row.

    Returns a list of non-empty words in order.
    """

    if not patient_id:
        print("[agentic-db] Cannot fetch target words without a patient_id.")
        return []

    client = _get_client()
    if client is None:
        print("[agentic-db] Supabase client unavailable; cannot fetch target words.")
        return []

    try:
        response = (
            client
            .table("sessions")
            .select("target_words, session_date")
            .eq("patient_id", patient_id)
            .order("session_date", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        print(f"[agentic-db] Error querying public.sessions for target words: {exc}")
        return []

    data = getattr(response, "data", None) or []
    if not data or not isinstance(data, list):
        print(f"[agentic-db] No sessions found for patient_id={patient_id} in public.sessions.")
        return []

    row = data[0] or {}
    values = row.get("target_words")
    if not isinstance(values, list) or not values:
        print(f"[agentic-db] target_words empty or not an array for patient_id={patient_id}.")
        return []

    words: list[str] = []
    for value in values:
        candidate = str(value).strip()
        if candidate:
            words.append(candidate)

    if words:
        print(f"[agentic-db] Loaded {len(words)} target word(s) for patient {patient_id}.")
        return words

    print(f"[agentic-db] No non-empty entries in target_words for patient_id={patient_id}.")
    return []


# ── Allowed values for difficulty_level ─────────────────────────────────────
_VALID_DIFFICULTY_LEVELS = {"easy", "medium", "hard"}


def _as_text_array(value: Any) -> list[str]:
    """Normalize a value into a list[str] suitable for Postgres text[] columns."""

    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    text = str(value).strip()
    return [text] if text else []


def fetch_personalization_config(
    patient_id: str,
    assignment_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Return therapist-configured personalization for a patient/assignment.

    Lookup priority:
    1. ``therapist_assignments`` row keyed by ``assignment_id`` (when provided).
    2. Safe defaults when no assignment is given or the row is missing.

    Returned dict always has these keys with safe, normalized values:
        therapy_goals        – list[str]
        phonemes_to_focus_on – list[str]
        difficulty_level     – 'easy' | 'medium' | 'hard'
    """

    defaults: Dict[str, Any] = {
        "therapy_goals":        [],
        "phonemes_to_focus_on": [],
        "difficulty_level":     "medium",
    }

    client = _get_client()
    if client is None:
        return defaults

    row: Dict[str, Any] = {}

    if assignment_id:
        try:
            response = (
                client
                .table("therapist_assignments")
                .select("therapy_goals, phonemes_to_focus_on, difficulty_level")
                .eq("id", assignment_id)
                .limit(1)
                .execute()
            )
            data = getattr(response, "data", None) or []
            if data and isinstance(data, list):
                row = data[0] or {}
        except Exception as exc:
            print(f"[agentic-db] Error fetching personalization from therapist_assignments: {exc}")

    # ── Normalize each field ──────────────────────────────────────────────────

    # therapy_goals: must be a list of non-empty strings.
    raw_goals = row.get("therapy_goals") or []
    if isinstance(raw_goals, str):
        raw_goals = [raw_goals]
    therapy_goals = [str(g).strip() for g in raw_goals if str(g).strip()] 

    # phonemes_to_focus_on: must be a list of non-empty strings.
    raw_phonemes = row.get("phonemes_to_focus_on") or []
    if isinstance(raw_phonemes, str):
        raw_phonemes = [raw_phonemes]
    phonemes_to_focus_on = [str(p).strip() for p in raw_phonemes if str(p).strip()]

    # difficulty_level: must be one of the allowed values; default to 'medium'.
    raw_difficulty = str(row.get("difficulty_level") or "").strip().lower()
    difficulty_level = raw_difficulty if raw_difficulty in _VALID_DIFFICULTY_LEVELS else "medium"

    config: Dict[str, Any] = {
        "therapy_goals":        therapy_goals,
        "phonemes_to_focus_on": phonemes_to_focus_on,
        "difficulty_level":     difficulty_level,
    }

    if assignment_id and row:
        print(
            f"[agentic-db] Personalization loaded: goals={therapy_goals}, "
            f"phonemes={phonemes_to_focus_on}, difficulty={difficulty_level}"
        )
    else:
        print("[agentic-db] No personalization config found; using defaults.")

    return config


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
    history: list[Dict[str, Any]] = list(state.get("session_history") or [])

    # Prefer an existing duration if present; otherwise derive from session_start.
    duration: Optional[int] = state.get("session_duration_secs")
    if duration is None and state.get("session_start") is not None:
        try:
            duration = int(max(0, time.time() - float(state.get("session_start") or 0)))
        except Exception:
            duration = None

    # Map SpeechTherapyState → session_reports columns.
    # session_reports.target_word is stored as text[] in this schema.
    # Persist the full session target list when available.
    state_target_words = state.get("target_words") or []
    target_word_array = [str(w).strip() for w in state_target_words if str(w).strip()]
    if not target_word_array:
        # Backward-compatible fallback when only a single target word exists.
        target_word_value = state.get("target_word")
        target_word_array = [str(target_word_value).strip()] if target_word_value else None

    if history:
        accuracies = [float(item.get("accuracy", 0) or 0) for item in history]
        total_errors = sum(int(item.get("total_errors", 0) or 0) for item in history)
        substitutions = sum(int(item.get("substitutions", 0) or 0) for item in history)
        omissions = sum(int(item.get("omissions", 0) or 0) for item in history)
        insertions = sum(int(item.get("insertions", 0) or 0) for item in history)

        transcript_lines = []
        feedback_lines = []
        practice_lines = []
        semantic_values = []
        model_used = None

        for idx, item in enumerate(history, 1):
            word = str(item.get("target_word", "")).strip() or f"word_{idx}"
            transcript = str(item.get("transcript", "")).strip()
            attempt_rows = item.get("transcript_attempts") or []
            feedback_text = str(item.get("feedback_text", "")).strip()
            practice_text = str(item.get("practice_exercise", "")).strip()
            semantic_label = str(item.get("semantic_label", "")).strip()
            model_label = str(item.get("model_used", "")).strip()

            if attempt_rows and isinstance(attempt_rows, list):
                # Store all perception loop transcripts for this word.
                for attempt in attempt_rows:
                    if not isinstance(attempt, dict):
                        continue
                    attempt_no = attempt.get("attempt_number")
                    attempt_text = str(attempt.get("transcript", "")).strip()
                    if attempt_text:
                        transcript_lines.append(f"{word} (attempt {attempt_no}): {attempt_text}")
                # Fallback to final transcript if the attempts list is empty/blank.
                if transcript and not any(str(a.get("transcript", "")).strip() for a in attempt_rows if isinstance(a, dict)):
                    transcript_lines.append(f"{word}: {transcript}")
            elif transcript:
                # Backward-compatible: only one transcript stored per word.
                transcript_lines.append(f"{word}: {transcript}")
            if feedback_text:
                feedback_lines.append(f"{word}: {feedback_text}")
            if practice_text:
                practice_lines.append(f"{word}: {practice_text}")
            if semantic_label:
                semantic_values.append(semantic_label)
            if model_label:
                model_used = model_label

        unique_semantics = sorted(set(semantic_values))
        summary_semantic = ", ".join(unique_semantics) if unique_semantics else state.get("semantic_label")

        report: Dict[str, Any] = {
            # Required identity
            "patient_id":            patient_id,
            "assignment_id":         state.get("assignment_id"),

            # Core session info (aggregated)
            "target_word":           target_word_array,
            "transcript":            "\n".join(transcript_lines) if transcript_lines else state.get("transcript"),

            # Error metrics (aggregated)
            "accuracy":              round(sum(accuracies) / max(len(accuracies), 1), 2),
            "total_errors":          total_errors,
            "substitutions":         substitutions,
            "omissions":             omissions,
            "insertions":            insertions,
            "semantic_label":        summary_semantic,

            # Feedback content (aggregated)
            "feedback_given":        "\n".join(feedback_lines) if feedback_lines else feedback.get("feedback_text"),
            "practice_exercise":     "\n".join(practice_lines) if practice_lines else state.get("practice_exercise"),

            # Therapist personalization (preserved for analytics)
            "therapy_goals":         state.get("therapy_goals") or [],
            "phonemes_to_focus_on":  state.get("phonemes_to_focus_on") or [],
            "difficulty_level":      state.get("difficulty_level") or "medium",

            # Timing / provenance
            "session_duration_secs": duration,
            "model_used":            model_used or feedback.get("model_used"),
        }
    else:
        report = {
            # Required identity
            "patient_id":            patient_id,
            "assignment_id":         state.get("assignment_id"),

            # Core session info
            "target_word":           target_word_array,
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

            # Therapist personalization (preserved for analytics)
            "therapy_goals":         state.get("therapy_goals") or [],
            "phonemes_to_focus_on":  state.get("phonemes_to_focus_on") or [],
            "difficulty_level":      state.get("difficulty_level") or "medium",

            # Timing / provenance
            "session_duration_secs": duration,
            "model_used":            feedback.get("model_used"),
        }

    # Drop keys whose value is None so we only send populated fields.
    clean_report = {key: value for key, value in report.items() if value is not None}

    try:
        response = client.table(_SESSION_REPORTS_TABLE).insert(clean_report).execute()
        data = getattr(response, "data", None) or []
        if data and isinstance(data, list) and data[0].get("id"):
            return str(data[0]["id"])
        print("[agentic-db] Insert did not return an id; response=", data)
        return None
    except Exception as exc:
        message = str(exc)

        # Some schemas store difficulty_level as text[] instead of text.
        # If we get a malformed array literal (e.g., "medium"), retry once
        # after coercing the value to a one-item list.
        if "malformed array literal" in message.lower() and "difficulty_level" in clean_report:
            retry_report = dict(clean_report)
            retry_report["difficulty_level"] = _as_text_array(clean_report.get("difficulty_level"))
            try:
                response = client.table(_SESSION_REPORTS_TABLE).insert(retry_report).execute()
                data = getattr(response, "data", None) or []
                if data and isinstance(data, list) and data[0].get("id"):
                    print("[agentic-db] Retried insert with array-formatted difficulty_level.")
                    return str(data[0]["id"])
                print("[agentic-db] Retry insert did not return an id; response=", data)
                return None
            except Exception as retry_exc:
                print(
                    f"[agentic-db] Error inserting session report into '{_SESSION_REPORTS_TABLE}' "
                    f"after array retry: {retry_exc}"
                )
                return None

        print(f"[agentic-db] Error inserting session report into '{_SESSION_REPORTS_TABLE}': {exc}")
        return None
