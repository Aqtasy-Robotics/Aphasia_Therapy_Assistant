"""Mouth driver — Piper TTS + speaker output.
"""

from __future__ import annotations

from typing import Any, Dict

from loguru import logger


async def speak(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Speak the requested text using TTS.

    Expected payload (from backend command):
        {
            "text": "Hello, let's practice",
            "voice": "en_US-lessac-medium",   # optional
            "volume": 0.8                     # optional override
        }
    """

    text = payload.get("text") or payload.get("utterance") or "<no text>"
    voice = payload.get("voice", "default")
    volume = payload.get("volume")

    # NOTE: Real implementation (Phase 3) will:
    #   - load Piper model
    #   - synthesise audio to numpy array
    #   - play via sounddevice with configured volume
    logger.info("[MOUTH] speak: text={!r}, voice={}, volume={}", text, voice, volume)

    return {
        "driver": "mouth",
        "action": "speak",
        "text": text,
        "voice": voice,
        "volume": volume,
        "status": "ok_stub",
    }


__all__ = ["speak"]

