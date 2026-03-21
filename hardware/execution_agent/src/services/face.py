"""Face driver — procedural OLED eyes."""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time
from typing import Any, Dict

from PIL import Image, ImageDraw

try:
    from luma.core.interface.serial import i2c
    from luma.core.interface.serial import spi
    from luma.oled.device import ssd1351
    import luma.oled.device as oled_device_mod

    OLED_AVAILABLE = True
except Exception:  # noqa: BLE001
    OLED_AVAILABLE = False
    i2c = None
    spi = None
    ssd1351 = None
    oled_device_mod = None

logger = logging.getLogger(__name__)

EXPRESSION_PROFILE = {
    "neutral": {"openness": 0.62, "width_ratio": 0.34, "spacing": 0.19, "vertical_bias": 0.0},
    "happy": {"openness": 0.52, "width_ratio": 0.39, "spacing": 0.18, "vertical_bias": -0.08},
    "sad": {"openness": 0.38, "width_ratio": 0.31, "spacing": 0.21, "vertical_bias": 0.08},
    "thinking": {"openness": 0.44, "width_ratio": 0.27, "spacing": 0.23, "vertical_bias": -0.03},
    "surprised": {"openness": 0.86, "width_ratio": 0.30, "spacing": 0.18, "vertical_bias": -0.02},
    "listening": {"openness": 0.68, "width_ratio": 0.32, "spacing": 0.20, "vertical_bias": 0.0},
}

_oled_device: Any | None = None
_oled_settings_ref: Any | None = None
_render_lock = asyncio.Lock()
_standalone_task: asyncio.Task | None = None


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _prep_image_for_device(image: Image.Image, device: Any) -> Image.Image:
    """Convert image to device's expected mode (e.g. '1' for monochrome SH1107)."""
    target = getattr(device, "mode", "RGB")
    if image.mode == target:
        return image
    if target == "1":
        return image.convert("L").point(lambda x: 0 if x < 128 else 255, mode="1")
    return image.convert(target)


async def shutdown_face() -> None:
    """Clear and close OLED resources."""
    global _oled_device, _oled_settings_ref
    if _oled_device is None:
        return
    try:
        await asyncio.to_thread(_oled_device.clear)
        await asyncio.to_thread(_oled_device.hide)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Face shutdown encountered an error: %s", exc)
    finally:
        _oled_device = None
        _oled_settings_ref = None


def _init_oled(settings: Any) -> Any:
    """Initialize OLED device lazily from settings."""
    global _oled_device, _oled_settings_ref

    if not OLED_AVAILABLE:
        raise RuntimeError("OLED dependencies not available")
    if settings is None:
        raise RuntimeError("settings not provided")

    if _oled_device is not None and _oled_settings_ref is settings:
        return _oled_device

    oled = settings.oled
    if oled.interface == "spi":
        serial = spi(
            port=oled.spi_port,
            device=oled.spi_device,
            gpio_DC=oled.spi_gpio_dc,
            gpio_RST=oled.spi_gpio_rst,
            bus_speed_hz=oled.spi_bus_speed_hz,
        )
    else:
        serial = i2c(port=oled.i2c_port, address=int(str(oled.i2c_address), 16))

    driver = str(oled.oled_driver).lower()
    if driver == "ssd1351":
        _oled_device = ssd1351(
            serial_interface=serial,
            width=oled.width,
            height=oled.height,
            rotate=oled.rotate,
        )
    else:
        driver_cls = getattr(oled_device_mod, driver, None)
        if driver_cls is None:
            raise RuntimeError(f"Unsupported oled_driver={driver!r}")
        _oled_device = driver_cls(
            serial_interface=serial,
            width=oled.width,
            height=oled.height,
            rotate=oled.rotate,
        )
    _oled_settings_ref = settings
    return _oled_device


def _draw_frame(
    width: int,
    height: int,
    expression: str,
    gaze_x: float,
    gaze_y: float,
    blink_factor: float,
    micro_phase: float,
    *,
    eye_layout: str = "horizontal",
    eyes_bias_x: float = 0.0,
) -> Image.Image:
    profile = EXPRESSION_PROFILE.get(expression, EXPRESSION_PROFILE["neutral"])

    openness = _clamp(profile["openness"] * (1.0 - blink_factor), 0.08, 0.95)
    width_ratio = _clamp(profile["width_ratio"], 0.20, 0.45)
    spacing_ratio = _clamp(profile["spacing"], 0.10, 0.30)
    vertical_bias = _clamp(profile["vertical_bias"], -0.25, 0.25)

    # Eye geometry as ratios of panel dimensions.
    eye_w = int(width * width_ratio)
    eye_h = int(height * openness * 0.42)
    center_gap = int(width * spacing_ratio)

    base_y = int(height * (0.5 + vertical_bias + (math.sin(micro_phase) * 0.02)))
    gaze_dx = int(gaze_x * width * 0.09)
    gaze_dy = int(gaze_y * height * 0.09)
    bias_px = int(_clamp(eyes_bias_x, -1.0, 1.0) * width * 0.22)

    radius = max(2, int(min(eye_w, eye_h) * 0.35))

    img = Image.new("RGB", (width, height), "black")
    draw = ImageDraw.Draw(img)

    layout = str(eye_layout).lower().strip()
    if layout == "vertical":
        gap_y = max(4, int(height * spacing_ratio * 0.55))
        cx = width // 2 + bias_px + gaze_dx
        cy_mid = base_y + gaze_dy
        top_cy = cy_mid - gap_y // 2
        bot_cy = cy_mid + gap_y // 2
        top_box = [cx - eye_w // 2, top_cy - eye_h // 2, cx + eye_w // 2, top_cy + eye_h // 2]
        bot_box = [cx - eye_w // 2, bot_cy - eye_h // 2, cx + eye_w // 2, bot_cy + eye_h // 2]
        draw.rounded_rectangle(top_box, radius=radius, fill="white")
        draw.rounded_rectangle(bot_box, radius=radius, fill="white")
    else:
        left_cx = width // 2 - center_gap // 2 - eye_w // 2 + gaze_dx + bias_px
        right_cx = width // 2 + center_gap // 2 + eye_w // 2 + gaze_dx + bias_px
        cy = base_y + gaze_dy
        left_box = [left_cx - eye_w // 2, cy - eye_h // 2, left_cx + eye_w // 2, cy + eye_h // 2]
        right_box = [right_cx - eye_w // 2, cy - eye_h // 2, right_cx + eye_w // 2, cy + eye_h // 2]
        draw.rounded_rectangle(left_box, radius=radius, fill="white")
        draw.rounded_rectangle(right_box, radius=radius, fill="white")
    return img


def _eye_draw_kwargs(settings: Any | None) -> Dict[str, Any]:
    if settings is None:
        return {"eye_layout": "horizontal", "eyes_bias_x": 0.0}
    oled = settings.oled
    return {
        "eye_layout": getattr(oled, "eye_layout", "horizontal"),
        "eyes_bias_x": float(getattr(oled, "eyes_bias_x", 0.0)),
    }


async def show_face(payload: Dict[str, Any], settings: Any | None = None) -> Dict[str, Any]:
    """Render expression and gaze as procedural eyes.

    Payload contract:
        {"expression": "happy", "gaze_x": 0.2, "gaze_y": -0.1, "duration": 1.0}
    """
    expression = str(payload.get("expression", "neutral")).lower()
    gaze_x = _clamp(float(payload.get("gaze_x", 0.0)), -1.0, 1.0)
    gaze_y = _clamp(float(payload.get("gaze_y", 0.0)), -1.0, 1.0)
    duration = max(0.0, float(payload.get("duration", 1.0)))

    logger.info(
        "[FACE] show_face: expression=%s gaze_x=%s gaze_y=%s duration=%s",
        expression,
        gaze_x,
        gaze_y,
        duration,
    )

    if not OLED_AVAILABLE:
        logger.warning("OLED dependencies unavailable; returning mock show_face response")
        return {
            "driver": "face",
            "action": "show_face",
            "expression": expression,
            "gaze_x": gaze_x,
            "gaze_y": gaze_y,
            "duration": duration,
            "status": "ok_mock",
            "message": "luma.oled or Pillow not available",
        }

    try:
        async with _render_lock:
            device = _init_oled(settings)
            frame_w = int(device.width)
            frame_h = int(device.height)
            eye_kw = _eye_draw_kwargs(settings)

            start = time.monotonic()
            next_blink_at = start + random.uniform(0.8, 1.6)
            frame_delay = 0.05

            if duration == 0.0:
                image = _draw_frame(
                    frame_w, frame_h, expression, gaze_x, gaze_y, 0.0, 0.0, **eye_kw
                )
                await asyncio.to_thread(device.display, _prep_image_for_device(image, device))
            else:
                while True:
                    now = time.monotonic()
                    elapsed = now - start
                    if elapsed >= duration:
                        break

                    blink_factor = 0.0
                    if next_blink_at <= now <= (next_blink_at + 0.12):
                        # Triangular blink profile for smooth close/open.
                        progress = (now - next_blink_at) / 0.12
                        blink_factor = 1.0 - abs((progress * 2.0) - 1.0)
                    elif now > (next_blink_at + 0.12):
                        next_blink_at = now + random.uniform(1.0, 2.5)

                    image = _draw_frame(
                        frame_w,
                        frame_h,
                        expression,
                        gaze_x,
                        gaze_y,
                        blink_factor,
                        elapsed * 3.0,
                        **eye_kw,
                    )
                    await asyncio.to_thread(device.display, _prep_image_for_device(image, device))
                    await asyncio.sleep(frame_delay)

            return {
                "driver": "face",
                "action": "show_face",
                "expression": expression,
                "gaze_x": gaze_x,
                "gaze_y": gaze_y,
                "duration": duration,
                "status": "ok",
            }
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to render face expression: %s", exc)
        try:
            if _oled_device is not None:
                await asyncio.to_thread(_oled_device.clear)
        except Exception:  # noqa: BLE001
            pass
        return {
            "driver": "face",
            "action": "show_face",
            "expression": expression,
            "gaze_x": gaze_x,
            "gaze_y": gaze_y,
            "duration": duration,
            "status": "error",
            "error_message": str(exc),
        }


async def _standalone_math_eyes_loop(settings: Any) -> None:
    """Run math eyes until cancelled; on errors, log and re-init (keeps running under systemd)."""
    frame_delay = float(settings.oled.frame_delay_seconds)
    expressions = list(EXPRESSION_PROFILE.keys())

    while True:
        try:
            async with _render_lock:
                device = _init_oled(settings)
                frame_w = int(device.width)
                frame_h = int(device.height)
                eye_kw = _eye_draw_kwargs(settings)

            start = time.monotonic()
            next_blink_at = start + random.uniform(0.8, 1.6)

            while True:
                now = time.monotonic()
                elapsed = now - start

                expression = expressions[int(elapsed // 6) % len(expressions)]
                gaze_x = math.sin(elapsed * 0.60) * 0.55
                gaze_y = math.cos(elapsed * 0.37) * 0.35

                blink_factor = 0.0
                if next_blink_at <= now <= (next_blink_at + 0.12):
                    progress = (now - next_blink_at) / 0.12
                    blink_factor = 1.0 - abs((progress * 2.0) - 1.0)
                elif now > (next_blink_at + 0.12):
                    next_blink_at = now + random.uniform(1.1, 2.8)

                image = _draw_frame(
                    frame_w,
                    frame_h,
                    expression,
                    gaze_x,
                    gaze_y,
                    blink_factor,
                    elapsed * 3.0,
                    **eye_kw,
                )
                await asyncio.to_thread(device.display, _prep_image_for_device(image, device))
                await asyncio.sleep(frame_delay)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("Standalone OLED eyes hit an error; will retry in 3s")
            try:
                await shutdown_face()
            except Exception:  # noqa: BLE001
                pass
            await asyncio.sleep(3.0)


def maybe_start_standalone_face(settings: Any) -> None:
    """Start local math-based face animator when configured."""
    global _standalone_task
    if not OLED_AVAILABLE or not bool(settings.oled.standalone_math_eyes):
        return
    if _standalone_task is not None and not _standalone_task.done():
        return
    _standalone_task = asyncio.create_task(_standalone_math_eyes_loop(settings))
    logger.info("Started standalone math-eyes OLED animator")


async def stop_standalone_face() -> None:
    global _standalone_task
    if _standalone_task is None:
        return
    _standalone_task.cancel()
    try:
        await _standalone_task
    except asyncio.CancelledError:
        pass
    finally:
        _standalone_task = None


__all__ = [
    "show_face",
    "shutdown_face",
    "maybe_start_standalone_face",
    "stop_standalone_face",
]

