"""Tests for offline fallback helpers in ``feedback_node`` (no Groq calls)."""

from __future__ import annotations

import pytest

from agentic.nodes.feedback_node import _fallback_exercise, _fallback_feedback


@pytest.mark.parametrize(
    "accuracy,patient_name,target_word,expect_substr",
    [
        (90, "Alex", "cat", "Great job"),
        (60, "Alex", "cat", "Good try"),
        (30, "Alex", "cat", "okay"),
    ],
)
def test_fallback_feedback_accuracy_branches(
    accuracy: int, patient_name: str, target_word: str, expect_substr: str
) -> None:
    error_report = {
        "accuracy": accuracy,
        "total_errors": 1,
        "errors": [],
        "error_summary": {"substitutions": 0, "omissions": 0, "insertions": 0},
    }
    out = _fallback_feedback(error_report, target_word, patient_name)
    assert expect_substr.lower() in out["feedback_text"].lower()
    assert out["model_used"] == "fallback_template"


def test_fallback_feedback_substitution() -> None:
    error_report = {
        "accuracy": 55,
        "total_errors": 1,
        "errors": [{"type": "substitution", "target_phoneme": "k", "description": "x"}],
        "error_summary": {"substitutions": 1, "omissions": 0, "insertions": 0},
    }
    out = _fallback_feedback(error_report, "ball", "Sam")
    assert "k" in out["feedback_text"] or "sound" in out["feedback_text"].lower()


def test_fallback_exercise_no_errors() -> None:
    err = {"errors": []}
    text = _fallback_exercise(err, "sun")
    assert "sun" in text.lower()


def test_fallback_exercise_omission() -> None:
    err = {"errors": [{"type": "omission", "target_phoneme": "s"}]}
    text = _fallback_exercise(err, "sip")
    assert "s" in text
