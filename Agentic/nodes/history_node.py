from __future__ import annotations

from typing import Any, Dict, List

from db.mem0_store import search_session_memories
from state import SpeechTherapyState

def history_node(state: SpeechTherapyState) -> dict:
    history = list(state.get("session_history") or [])
    patient_id = state.get("patient_id")
    target_word = state.get("target_word")
    memory_context = search_session_memories(patient_id=patient_id, target_word=target_word, limit=5)

    recent = history[-3:] if len(history) >= 3 else history
    trend = "improving" if _is_improving(recent) else "needs work"
    
    return {
        "memory_context": memory_context,
        "patient_trend": trend,
        "sessions_done": len(history) + len(memory_context),
    }

def _is_improving(sessions: List[Dict[str, Any]]) -> bool:
    if len(sessions) < 2:
        return True
    accuracies = [s.get("accuracy", 0) for s in sessions]
    return accuracies[-1] > accuracies[0]