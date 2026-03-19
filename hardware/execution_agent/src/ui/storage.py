"""Persistence module for tracking practiced words."""

from __future__ import annotations

import json
import os
from typing import List


def _store_path() -> str:
    """Get path to persistent storage file."""
    # Use home directory so it works on Raspberry Pi and avoids permission issues
    return os.path.join(os.path.expanduser("~"), ".speech_therapy_practiced_words.json")


def load_practiced_word_ids() -> List[int]:
    """Load list of word IDs that have been practiced."""
    path = _store_path()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [int(x) for x in data]
    except FileNotFoundError:
        return []
    except Exception:
        # Corrupt or unexpected file format; start fresh
        return []
    return []


def mark_word_as_practiced(word_id: int) -> None:
    """Mark a word as practiced and persist to storage."""
    path = _store_path()
    practiced = load_practiced_word_ids()
    if word_id not in practiced:
        practiced.append(word_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(practiced, f)


def clear_practiced_words() -> None:
    """Clear all practiced word history."""
    path = _store_path()
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass
