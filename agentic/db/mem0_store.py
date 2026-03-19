"""Mem0-backed persistent memory helpers for speech therapy sessions.

This module uses the hosted Mem0 Platform client when ``MEM0_API_KEY`` is
available. It degrades safely to no-op behavior when the SDK or API key is
missing so the main therapy pipeline still runs.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

try:
    from mem0 import MemoryClient

    _MEM0_AVAILABLE = True
except Exception:
    MemoryClient = None
    _MEM0_AVAILABLE = False


_MEM0_API_KEY: Optional[str] = os.getenv("MEM0_API_KEY") or os.getenv("MEMO_API_KEY")
_mem0_client: Optional[Any] = None
_mem0_status_logged = False


def _get_client() -> Optional[Any]:
    """Return a shared Mem0 client, or None if memory is disabled."""

    global _mem0_client, _mem0_status_logged

    if _mem0_client is not None:
        return _mem0_client

    if not _MEM0_AVAILABLE:
        if not _mem0_status_logged:
            print("[mem0] mem0ai package not installed; persistent memory disabled.")
            _mem0_status_logged = True
        return None

    if not _MEM0_API_KEY:
        if not _mem0_status_logged:
            print("[mem0] MEM0_API_KEY not set; persistent memory disabled.")
            _mem0_status_logged = True
        return None

    try:
        _mem0_client = MemoryClient(api_key=_MEM0_API_KEY)
        if not _mem0_status_logged:
            print("[mem0] Mem0 client initialized.")
            _mem0_status_logged = True
        return _mem0_client
    except Exception as exc:
        if not _mem0_status_logged:
            print(f"[mem0] Failed to initialize Mem0 client: {exc}")
            _mem0_status_logged = True
        return None


def search_session_memories(
    patient_id: Optional[str],
    target_word: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Search Mem0 for prior speech-therapy memories relevant to this patient."""

    if not patient_id:
        return []

    client = _get_client()
    if client is None:
        return []

    query_parts = [
        "speech therapy session history",
        "pronunciation progress",
        "phoneme errors",
    ]
    if target_word:
        query_parts.append(f"target word {target_word}")
    query = ", ".join(query_parts)

    try:
        response = client.search(query, filters={"user_id": patient_id})
    except Exception as exc:
        print(f"[mem0] Error searching memories for patient {patient_id}: {exc}")
        return []

    raw_results = []
    if isinstance(response, dict):
        raw_results = response.get("results") or []
    elif hasattr(response, "get"):
        raw_results = response.get("results") or []

    memories: List[Dict[str, Any]] = []
    for item in raw_results[:limit]:
        if not isinstance(item, dict):
            continue
        memory_text = str(item.get("memory") or "").strip()
        if not memory_text:
            continue
        memories.append(
            {
                "id": item.get("id"),
                "memory": memory_text,
                "score": item.get("score"),
                "created_at": item.get("created_at"),
            }
        )

    return memories


def add_session_memory(patient_id: Optional[str], payload: Dict[str, Any]) -> bool:
    """Persist a structured session summary into Mem0 for later retrieval."""

    if not patient_id:
        return False

    client = _get_client()
    if client is None:
        return False

    patient_name = str(payload.get("patient_name") or "patient").strip() or "patient"
    target_word = str(payload.get("target_word") or "").strip() or "unknown"
    transcript = str(payload.get("transcript") or "").strip() or "unclear"
    semantic_label = str(payload.get("semantic_label") or "unknown").strip() or "unknown"
    accuracy = payload.get("accuracy", 0)
    total_errors = payload.get("total_errors", 0)
    substitutions = payload.get("substitutions", 0)
    omissions = payload.get("omissions", 0)
    insertions = payload.get("insertions", 0)
    difficulty_level = str(payload.get("difficulty_level") or "medium").strip() or "medium"
    therapy_goals = ", ".join(payload.get("therapy_goals") or []) or "not specified"
    phonemes_to_focus_on = " ".join(payload.get("phonemes_to_focus_on") or []) or "not specified"
    feedback_text = str(payload.get("feedback_text") or "").strip() or "none"
    practice_exercise = str(payload.get("practice_exercise") or "").strip() or "none"

    memory_text = (
        f"Speech therapy session for {patient_name}. "
        f"Target word: {target_word}. Transcript: {transcript}. Accuracy: {accuracy}%. "
        f"Total errors: {total_errors}. Substitutions: {substitutions}. "
        f"Omissions: {omissions}. Insertions: {insertions}. Semantic label: {semantic_label}. "
        f"Therapy goals: {therapy_goals}. Focus phonemes: {phonemes_to_focus_on}. "
        f"Difficulty: {difficulty_level}. Feedback given: {feedback_text}. "
        f"Practice exercise: {practice_exercise}."
    )

    messages = [
        {"role": "user", "content": memory_text},
        {"role": "assistant", "content": "I will remember this speech therapy session for future feedback."},
    ]

    try:
        client.add(messages, user_id=patient_id)
        return True
    except Exception as exc:
        print(f"[mem0] Error storing session memory for patient {patient_id}: {exc}")
        return False