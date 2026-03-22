"""Tests for terminal LangGraph nodes."""

from __future__ import annotations

from agentic.nodes.terminal_nodes import hard_stop_node, success_node


def test_success_node() -> None:
    out = success_node({})  # type: ignore[arg-type]
    assert out["session_outcome"] == "success"
    assert out["session_complete"] is True


def test_hard_stop_node() -> None:
    out = hard_stop_node({})  # type: ignore[arg-type]
    assert out["session_outcome"] == "hard_stop"
    assert out["session_complete"] is True
