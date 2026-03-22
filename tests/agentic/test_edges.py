"""Unit tests for ``agentic.edges`` routing helpers."""

from __future__ import annotations

import pytest

from agentic.edges import (
    CONFIDENCE_THRESHOLD,
    MAX_FEEDBACK_RETRIES,
    MAX_RECORD_RETRIES,
    MIN_SCORE_TO_PASS,
    check_feedback_quality,
    check_transcription_quality,
    route_after_execution,
    route_by_error_type,
)


@pytest.mark.parametrize(
    "state,expected",
    [
        (
            {"retry_count": MAX_RECORD_RETRIES, "transcript": "hi", "confidence_score": 0.0},
            "therapist_review",
        ),
        ({"retry_count": 0, "transcript": "", "confidence_score": 0.0}, "re_record"),
        (
            {"retry_count": 0, "transcript": "hello", "confidence_score": CONFIDENCE_THRESHOLD - 0.1},
            "re_record",
        ),
        (
            {"retry_count": 0, "transcript": "hello", "confidence_score": CONFIDENCE_THRESHOLD},
            "analyze_phonemes",
        ),
    ],
)
def test_check_transcription_quality(state: dict, expected: str) -> None:
    assert check_transcription_quality(state) == expected  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "state,expected",
    [
        ({"semantic_label": "Neologistic", "error_report": {"errors": []}}, "deep_feedback"),
        (
            {"semantic_label": "Other", "error_report": {"errors": [{"type": "substitution"}]}},
            "standard_feedback",
        ),
    ],
)
def test_route_by_error_type(state: dict, expected: str) -> None:
    assert route_by_error_type(state) == expected  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "state,expected",
    [
        ({"feedback_attempts": MAX_FEEDBACK_RETRIES, "feedback": {}}, "therapist_review"),
        (
            {
                "feedback_attempts": 0,
                "feedback_scores": {"simplicity": 2, "empathy": 5, "actionable": 5},
                "feedback": {},
            },
            "retry_feedback",
        ),
        (
            {
                "feedback_attempts": 0,
                "feedback_scores": {
                    "simplicity": MIN_SCORE_TO_PASS,
                    "empathy": MIN_SCORE_TO_PASS,
                    "actionable": MIN_SCORE_TO_PASS,
                },
                "feedback": {},
            },
            "execute",
        ),
        (
            {"feedback_attempts": 0, "feedback_scores": None, "feedback": {"feedback_text": "x" * 41}},
            "execute",
        ),
        (
            {"feedback_attempts": 0, "feedback_scores": None, "feedback": {"feedback_text": "short"}},
            "retry_feedback",
        ),
    ],
)
def test_check_feedback_quality(state: dict, expected: str) -> None:
    assert check_feedback_quality(state) == expected  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "state,expected",
    [
        ({"has_more_target_words": True}, "continue_session"),
        ({"has_more_target_words": False}, "success"),
    ],
)
def test_route_after_execution(state: dict, expected: str) -> None:
    assert route_after_execution(state) == expected  # type: ignore[arg-type]
