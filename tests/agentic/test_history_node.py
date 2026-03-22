"""``history_node`` with Supabase/Mem0 dependencies mocked."""

from __future__ import annotations

from unittest.mock import patch

from agentic.nodes.history_node import history_node


@patch("agentic.nodes.history_node.fetch_recent_session_metrics")
@patch("agentic.nodes.history_node.search_session_memories")
def test_history_node_merges_trend_and_memories(mock_mem: object, mock_metrics: object) -> None:
    mock_mem.return_value = [{"id": "m1", "text": "prior"}]
    mock_metrics.return_value = ("needs work", 5)

    state = {
        "patient_id": "patient-uuid",
        "target_word": "hello",
    }
    out = history_node(state)  # type: ignore[arg-type]

    assert out["memory_context"] == [{"id": "m1", "text": "prior"}]
    assert out["patient_trend"] == "needs work"
    assert out["sessions_done"] == 5
    mock_mem.assert_called_once()
    mock_metrics.assert_called_once()
