"""Cross-session history: Supabase trends + optional Mem0 context."""

from __future__ import annotations

from typing import Any, Dict

from agentic.db.mem0_store import search_session_memories
from agentic.db.supabase_store import fetch_recent_session_metrics
from agentic.state import SpeechTherapyState


def history_node(state: SpeechTherapyState) -> Dict[str, Any]:
    """Load prior-session signals before feedback generation."""
    patient_id = state.get("patient_id")
    target_word = state.get("target_word")

    memory_context = search_session_memories(
        patient_id,
        target_word=str(target_word) if target_word else None,
        limit=5,
    )

    trend, sessions_done = fetch_recent_session_metrics(str(patient_id) if patient_id else "")

    print(
        f"[history_analysis] trend={trend!r} sessions_done={sessions_done} "
        f"mem0_hits={len(memory_context)}"
    )

    return {
        "memory_context": memory_context,
        "patient_trend": trend,
        "sessions_done": sessions_done,
    }


__all__ = ["history_node"]
