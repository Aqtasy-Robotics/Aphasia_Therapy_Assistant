"""Head driver — servo pan/tilt control.
"""

from __future__ import annotations

from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

async def move_head(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Move the robot's head to the requested angles.

    Expected payload:
        {
            "pan": 30,             # degrees, -90 to +90
            "tilt": -10,           # degrees, -30 to +30
            "speed": "slow"        # optional: slow/normal/fast
        }
    """

    pan = payload.get("pan", 0)
    tilt = payload.get("tilt", 0)
    speed = payload.get("speed", "normal")

    # NOTE: Real implementation (Phase 5) will:
    #   - clamp pan/tilt to safe ranges
    #   - command gpiozero.AngularServo instances
    logger.info("[HEAD] move_head: pan=%s tilt=%s speed=%s", pan, tilt, speed)

    return {
        "driver": "head",
        "action": "move_head",
        "pan": pan,
        "tilt": tilt,
        "speed": speed,
        "status": "ok_stub",
    }


__all__ = ["move_head"]