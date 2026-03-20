#!/usr/bin/env python3
"""
Pan servo physical test (Phase 5).

This script is intentionally standalone so you can upload only this folder
to the Raspberry Pi.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import time
from typing import Any, Dict

try:
    from gpiozero import AngularServo

    GPIOZERO_AVAILABLE = True
except Exception:  # noqa: BLE001
    AngularServo = None
    GPIOZERO_AVAILABLE = False

try:
    # pigpio backend allows PWM on arbitrary GPIO pins (including ones not supported by
    # the "native" factory). When present, use it explicitly to avoid PinPWMUnsupported.
    from gpiozero.pins.pigpio import PiGPIOFactory

    PIGPIO_AVAILABLE = True
except Exception:  # noqa: BLE001
    PiGPIOFactory = None
    PIGPIO_AVAILABLE = False

try:
    # lgpio backend is another option when pigpio isn't available.
    from gpiozero.pins.lgpio import LGPIOFactory

    LGPIO_AVAILABLE = True
except Exception:  # noqa: BLE001
    LGPIOFactory = None
    LGPIO_AVAILABLE = False


PAN_MIN_DEFAULT = -90.0
PAN_MAX_DEFAULT = 90.0

SPEED_PROFILES: Dict[str, Dict[str, float]] = {
    "slow": {"step_deg": 2.0, "delay_s": 0.04},
    "normal": {"step_deg": 5.0, "delay_s": 0.02},
    "fast": {"step_deg": 12.0, "delay_s": 0.008},
}


def _clamp(val: Any, lower: float, upper: float) -> float:
    try:
        f = float(val)
    except (TypeError, ValueError):
        f = 0.0
    return max(lower, min(upper, f))


def _load_config(config_path: Path) -> Dict[str, Any]:
    if not config_path.exists():
        return {}
    return json.loads(config_path.read_text(encoding="utf-8"))


async def _set_angle(servo: AngularServo, angle: float) -> None:
    # gpiozero sets synchronously; wrap in to_thread so the loop can yield.
    # Some sweep loops may accumulate floating point error; clamp to the
    # servo's configured safe range before setting.
    min_angle = float(getattr(servo, "min_angle", PAN_MIN_DEFAULT))
    max_angle = float(getattr(servo, "max_angle", PAN_MAX_DEFAULT))
    safe_angle = _clamp(float(angle), min_angle, max_angle)
    await asyncio.to_thread(setattr, servo, "angle", safe_angle)


async def _release(servo: AngularServo) -> None:
    # De-energize and reduce jitter after movement.
    await asyncio.to_thread(setattr, servo, "value", None)


async def run_sweep(
    servo: AngularServo,
    pan_min: float,
    pan_max: float,
    step_deg: float,
    speed: str,
    duration_s: float,
) -> None:
    profile = SPEED_PROFILES.get(speed, SPEED_PROFILES["normal"])
    step = abs(float(step_deg)) if step_deg else profile["step_deg"]

    if duration_s <= 0:
        return

    start = time.monotonic()
    while time.monotonic() - start < duration_s:
        # Sweep min->max
        current = servo.angle if servo.angle is not None else 0.0
        target = pan_max
        direction = 1.0 if target >= current else -1.0
        pos = current
        while (pos - target) * direction < 0:
            pos += direction * step
            if (pos - target) * direction > 0:
                pos = target
            await _set_angle(servo, pos)
            await asyncio.sleep(profile["delay_s"])
        await _set_angle(servo, target)
        await asyncio.sleep(0.1)

        # Sweep max->min
        current = servo.angle if servo.angle is not None else 0.0
        target = pan_min
        direction = 1.0 if target >= current else -1.0
        pos = current
        while (pos - target) * direction < 0:
            pos += direction * step
            if (pos - target) * direction > 0:
                pos = target
            await _set_angle(servo, pos)
            await asyncio.sleep(profile["delay_s"])
        await _set_angle(servo, target)
        await asyncio.sleep(0.1)


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="test_config.json")
    parser.add_argument("--duration_s", type=float, default=10.0)
    parser.add_argument("--speed", default="normal", choices=["slow", "normal", "fast"])
    parser.add_argument("--pan_min", type=float, default=PAN_MIN_DEFAULT)
    parser.add_argument("--pan_max", type=float, default=PAN_MAX_DEFAULT)
    parser.add_argument("--step_deg", type=float, default=0.0, help="0 uses speed profile step")
    args = parser.parse_args()

    if not GPIOZERO_AVAILABLE:
        print("ERROR: gpiozero not available. Install gpiozero and run on the Pi.")
        return 2

    config_path = Path(args.config)
    cfg = _load_config(config_path)
    gpio = cfg.get("gpio", {})

    pan_pin = int(gpio.get("servo_pan_pin", 17))
    min_pw = float(gpio.get("servo_min_pulse_width", 0.0005))
    max_pw = float(gpio.get("servo_max_pulse_width", 0.0025))

    pan_min = _clamp(args.pan_min, PAN_MIN_DEFAULT, PAN_MAX_DEFAULT)
    pan_max = _clamp(args.pan_max, PAN_MIN_DEFAULT, PAN_MAX_DEFAULT)
    if pan_max < pan_min:
        pan_min, pan_max = pan_max, pan_min

    step_deg = float(args.step_deg)

    print(f"Initializing pan servo on BCM pin {pan_pin}...")
    pin_factory = None
    if PIGPIO_AVAILABLE:
        pin_factory = PiGPIOFactory()
        print("Using pigpio pin factory for PWM.")
    elif LGPIO_AVAILABLE:
        pin_factory = LGPIOFactory()
        print("Using lgpio pin factory for PWM.")
    else:
        print("No PWM-capable gpiozero pin factory available (install pigpio/lgpio).")
        return 2

    servo = AngularServo(
        pan_pin,
        min_pulse_width=min_pw,
        max_pulse_width=max_pw,
        min_angle=PAN_MIN_DEFAULT,
        max_angle=PAN_MAX_DEFAULT,
        pin_factory=pin_factory,
    )

    # Give the servo time to come up.
    await _set_angle(servo, 0.0)
    await asyncio.sleep(0.3)

    try:
        print(
            f"Sweeping pan: {pan_min}..{pan_max} deg, speed={args.speed}, duration={args.duration_s}s"
        )
        await run_sweep(
            servo=servo,
            pan_min=pan_min,
            pan_max=pan_max,
            step_deg=step_deg,
            speed=args.speed,
            duration_s=args.duration_s,
        )
        return 0
    finally:
        try:
            await _release(servo)
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

