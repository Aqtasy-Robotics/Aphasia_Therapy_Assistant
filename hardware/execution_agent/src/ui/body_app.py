"""Body UI driver — Kivy 7\" touchscreen integration.
"""

from __future__ import annotations

from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)


async def show_ui(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update the on-screen UI based on the payload.

    Expected payload, e.g.:
        {
            "screen": "prompt",              # idle/prompt/feedback/settings
            "word": "apple",                 # for prompt screen
            "image_url": "http://...",       # optional
            "feedback": "correct"            # for feedback screen
        }
    """

    screen = payload.get("screen", "idle")

    # NOTE: Real implementation (Phase 4) will:
    #   - communicate with the running Kivy app (queues or shared state)
    #   - trigger screen changes and content updates
    logger.info("[UI] show_ui: screen=%s payload=%s", screen, payload)

    return {
        "driver": "body_app",
        "action": "show_ui",
        "screen": screen,
        "status": "ok_stub",
    }


__all__ = ["show_ui"]