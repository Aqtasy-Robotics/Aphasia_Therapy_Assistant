"""Ear driver — microphone recording.
"""

from __future__ import annotations

from typing import Any, Dict

from loguru import logger


async def listen(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Record audio from the microphone.

    Expected payload (from backend command):
        {
            "duration_s": 5,
            "prompt": "Say 'apple'"   # optional, for logging/UI only
        }

    Returns a metadata dict; the actual WAV upload happens elsewhere
    once the recording pipeline is implemented.
    """

    duration_s = payload.get("duration_s", 5)
    prompt = payload.get("prompt")

    # NOTE: Real implementation (Phase 3) will:
    #   - record audio with sounddevice for duration_s
    #   - encode to WAV bytes
    #   - hand off to ApiClient.send_audio()
    logger.info("[EAR] listen: duration_s={}, prompt={!r}", duration_s, prompt)

    return {
        "driver": "ear",
        "action": "listen",
        "duration_s": duration_s,
        "prompt": prompt,
        "status": "ok_stub",
    }


__all__ = ["listen"]

