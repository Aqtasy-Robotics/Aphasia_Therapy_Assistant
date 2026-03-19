"""Pronunciation analysis module for speech therapy."""

from __future__ import annotations

from dataclasses import dataclass
import random
from typing import Optional


@dataclass(frozen=True)
class PronunciationStats:
    """Statistics from pronunciation analysis."""
    accuracy_percent: int
    vowel_score_percent: int
    consonant_score_percent: int
    phoneme_errors: int
    detected_word: str


def analyze_pronunciation(
    expected_word: str,
    *,
    audio_available: bool = False,
    seed: Optional[int] = None,
) -> tuple[PronunciationStats, str]:
    """
    Demo pronunciation analysis - replace with real audio->text->scoring logic.

    In production, integrate with Vosk/Whisper + scoring algorithms.

    Args:
        expected_word: The target word being practiced
        audio_available: Whether audio was successfully captured
        seed: Random seed for reproducible results (testing)

    Returns:
        Tuple of (PronunciationStats, feedback_message)
    """
    rng = random.Random(seed)

    # Base accuracy depends on whether we have audio
    base = 55 if not audio_available else 65
    accuracy = rng.randint(base, 98)

    # Derived scores
    vowel = max(0, min(100, accuracy + rng.randint(-10, 10)))
    consonant = max(0, min(100, accuracy + rng.randint(-15, 15)))
    phoneme_errors = max(0, int((100 - accuracy) / 5))

    # Placeholder detected word
    detected_word = expected_word if rng.random() > 0.25 else f"{expected_word[: max(1, len(expected_word) - 1)]}?"

    # Generate feedback
    if accuracy >= 92:
        feedback = "Perfect! Great pronunciation."
    elif accuracy >= 78:
        feedback = "Nice try! Keep practicing to improve clarity."
    else:
        feedback = "Let's try again. Say it slowly and clearly."

    stats = PronunciationStats(
        accuracy_percent=accuracy,
        vowel_score_percent=vowel,
        consonant_score_percent=consonant,
        phoneme_errors=phoneme_errors,
        detected_word=detected_word,
    )
    return stats, feedback
