"""Face driver — OLED expressions.
"""

from __future__ import annotations

from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)


async def show_face(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Show an expression on the robot's face.

    Expected payload:
        {
            "expression": "happy"   # happy/sad/thinking/surprised/neutral/listening
        }
    """

    expression = payload.get("expression", "neutral")

    # NOTE: Real implementation (Phase 5) will:
    #   - load the appropriate PNG from assets/images/faces/
    #   - render to OLED using luma.oled
    logger.info("[FACE] show_face: expression=%s", expression)

    return {
        "driver": "face",
        "action": "show_face",
        "expression": expression,
        "status": "ok_stub",
    }


__all__ = ["show_face"]

