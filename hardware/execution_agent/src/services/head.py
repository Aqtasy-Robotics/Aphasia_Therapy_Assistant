"""Head driver — pan-only servo control."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

try:
    from gpiozero import AngularServo

    GPIOZERO_AVAILABLE = True
except Exception:  # noqa: BLE001
    AngularServo = None
    GPIOZERO_AVAILABLE = False

try:
    from gpiozero.pins.pigpio import PiGPIOFactory

    PIGPIO_AVAILABLE = True
except Exception:  # noqa: BLE001
    PiGPIOFactory = None
    PIGPIO_AVAILABLE = False

try:
    from gpiozero.pins.lgpio import LGPIOFactory

    LGPio_AVAILABLE = True
except Exception:  # noqa: BLE001
    LGPIOFactory = None
    LGPio_AVAILABLE = False

logger = logging.getLogger(__name__)

PAN_MIN = -90.0
PAN_MAX = 90.0
SPEED_PROFILES = {
    "slow": {"step_deg": 2.0, "delay_s": 0.04},
    "normal": {"step_deg": 5.0, "delay_s": 0.02},
    "fast": {"step_deg": 12.0, "delay_s": 0.008},
}

_servo: AngularServo | None = None
_servo_settings_ref: Any | None = None
_servo_lock = asyncio.Lock()


def _clamp_pan(value: Any) -> float:
    """Convert to float and clamp to safe pan range."""
    try:
        pan = float(value)
    except (TypeError, ValueError):
        pan = 0.0
    return max(PAN_MIN, min(PAN_MAX, pan))


def _normalise_speed(value: Any) -> str:
    speed = str(value or "normal").lower()
    return speed if speed in SPEED_PROFILES else "normal"


def _ensure_servo(settings: Any) -> AngularServo:
    """Lazy-initialize AngularServo from runtime settings."""
    global _servo, _servo_settings_ref

    if not GPIOZERO_AVAILABLE:
        raise RuntimeError("gpiozero not available")

    if settings is None:
        raise RuntimeError("settings not provided")

    if _servo is not None and _servo_settings_ref is settings:
        return _servo

    gpio = settings.gpio
    if PIGPIO_AVAILABLE:
        pin_factory = PiGPIOFactory()
    elif LGPio_AVAILABLE:
        pin_factory = LGPIOFactory()
    else:
        pin_factory = None
    _servo = AngularServo(
        gpio.servo_pan_pin,
        min_pulse_width=gpio.servo_min_pulse_width,
        max_pulse_width=gpio.servo_max_pulse_width,
        min_angle=PAN_MIN,
        max_angle=PAN_MAX,
        pin_factory=pin_factory,
    )
    _servo_settings_ref = settings
    return _servo


async def _set_servo_angle(servo: AngularServo, angle: float) -> None:
    # Clamp before setting to avoid OutputDeviceBadValue due to float step
    # accumulation during interpolation.
    min_angle = float(getattr(servo, "min_angle", PAN_MIN))
    max_angle = float(getattr(servo, "max_angle", PAN_MAX))
    safe_angle = max(min_angle, min(max_angle, float(angle)))
    await asyncio.to_thread(setattr, servo, "angle", safe_angle)


async def _release_servo(servo: AngularServo) -> None:
    # Setting value to None de-energizes on gpiozero servos and helps reduce jitter.
    await asyncio.to_thread(setattr, servo, "value", None)


async def shutdown_head() -> None:
    """Release and close servo resources."""
    global _servo, _servo_settings_ref
    if _servo is None:
        return
    try:
        await _release_servo(_servo)
        await asyncio.to_thread(_servo.close)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Head shutdown encountered an error: %s", exc)
    finally:
        _servo = None
        _servo_settings_ref = None


async def move_head(payload: Dict[str, Any], settings: Any | None = None) -> Dict[str, Any]:
    """Move the robot's head pan servo.

    Expected payload:
        {"pan": 30, "speed": "slow"}  # pan clamped to -90..90
    """
    requested_pan = payload.get("pan", 0)
    pan = _clamp_pan(requested_pan)
    speed = _normalise_speed(payload.get("speed", "normal"))

    logger.info("[HEAD] move_head: requested_pan=%s pan=%s speed=%s", requested_pan, pan, speed)

    if not GPIOZERO_AVAILABLE:
        logger.warning("gpiozero unavailable; returning mock move_head response")
        return {
            "driver": "head",
            "action": "move_head",
            "pan": pan,
            "speed": speed,
            "status": "ok_mock",
            "message": "gpiozero not available",
        }

    try:
        async with _servo_lock:
            servo = _ensure_servo(settings)
            current = servo.angle if servo.angle is not None else 0.0
            profile = SPEED_PROFILES[speed]

            delta = pan - current
            if abs(delta) <= profile["step_deg"]:
                await _set_servo_angle(servo, pan)
            else:
                step = profile["step_deg"] if delta > 0 else -profile["step_deg"]
                position = current
                while abs(pan - position) > profile["step_deg"]:
                    position += step
                    await _set_servo_angle(servo, position)
                    await asyncio.sleep(profile["delay_s"])
                await _set_servo_angle(servo, pan)

            await asyncio.sleep(0.05)
            await _release_servo(servo)

        return {
            "driver": "head",
            "action": "move_head",
            "pan": pan,
            "speed": speed,
            "status": "ok",
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to move head servo: %s", exc)
        return {
            "driver": "head",
            "action": "move_head",
            "pan": pan,
            "speed": speed,
            "status": "error",
            "error_message": str(exc),
        }


__all__ = ["move_head", "shutdown_head"]

