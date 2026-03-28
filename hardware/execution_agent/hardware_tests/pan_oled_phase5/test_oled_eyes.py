#!/usr/bin/env python3
"""
Procedural OLED eyes physical test (Phase 5).

Uploads only this folder to the Pi and run:
  python3 test_oled_eyes.py --duration 5.0 --expression neutral
"""

from __future__ import annotations

import argparse
import asyncio
import fcntl
import json
import os
from pathlib import Path
import math
import random
import time
from typing import Any, Dict, Iterable

# Linux i2c-dev: raw write after I2C_SLAVE matches what `i2cset`/many OLEDs expect.
# SMBus write_byte_data / write_i2c_block_data can NACK on SH1107-style modules.
I2C_SLAVE = 0x0703
# Some OLEDs don't respond to kernel address probe; allow bind without full ACK probe.
I2C_SLAVE_FORCE = 0x0706

from PIL import Image, ImageDraw

try:
    from luma.core.interface.serial import i2c
    from luma.core.interface.serial import spi
    from luma.oled.device import ssd1351

    import luma.oled.device as oled_device_mod

    LUMA_AVAILABLE = True
except Exception:  # noqa: BLE001
    i2c = None
    spi = None
    ssd1351 = None
    oled_device_mod = None
    LUMA_AVAILABLE = False


class Sh1107NativeI2C:
    """
    **GME128128-01** (Golden Morning 1.5\" 128x128 SH1107 IIC): init sequence from
    **u8g2** `u8x8_d_sh1107_128x128_init_seq` — includes 0xD5/0x50, 0xDA/0x12, contrast
    0x2F; omits 0xD3 unless `sh1107_use_d3`. Horizontal **column_x_offset** defaults
    to **96** (u8g2); set to **0** if image is shifted (u8g2 issue #2581).
    """

    MODE = "1"

    def __init__(
        self,
        i2c_port: int,
        address: int,
        width: int = 128,
        height: int = 128,
        rotate: int = 0,
        display_offset: int = 0,
        *,
        column_x_offset: int | None = None,
        sh1107_use_d3: bool = False,
        cmd_byte_delay_s: float = 0.0,
        data_chunk: int = 16,
        cmd_control: int = 0x00,
        data_control: int = 0x40,
    ) -> None:
        if (width, height) not in {(128, 128), (128, 64), (64, 128)}:
            raise ValueError(f"Unsupported SH1107 size for native driver: {width}x{height}")
        self._fd = os.open(f"/dev/i2c-{i2c_port}", os.O_RDWR)
        self._addr = int(address)
        self.width = int(width)
        self.height = int(height)
        self.rotate = int(rotate)
        self._pages = self.height // 8
        self._pagelen = self.width
        self._cmd_delay = float(cmd_byte_delay_s)
        self._data_chunk = max(1, int(data_chunk))
        self._cmd_control = int(cmd_control) & 0xFF
        self._data_control = int(data_control) & 0xFF

        if column_x_offset is None:
            column_x_offset = 96 if (width, height) == (128, 128) else 0
        self._x_offset = int(column_x_offset) & 0xFF

        multiplex = self.height - 1
        time.sleep(0.05)

        seq: list[int] = [
            0xAE,
            0xDC,
            0x00,
            0x81,
            0x2F,
            0x20,
            0xA0,
            0xC0,
            0xA8,
            multiplex & 0xFF,
        ]
        if sh1107_use_d3:
            seq.extend([0xD3, display_offset & 0xFF])
        seq.extend(
            [
                0xD5,
                0x50,
                0xD9,
                0x22,
                0xDB,
                0x35,
                0xB0,
                0xDA,
                0x12,
                0xA4,
                0xA6,
                0xAF,
            ]
        )
        self._write_cmd_bytes(*seq)
        time.sleep(0.05)

    def close(self) -> None:
        try:
            os.close(self._fd)
        except OSError:
            pass

    def _bind_slave(self) -> None:
        try:
            fcntl.ioctl(self._fd, I2C_SLAVE_FORCE, self._addr)
        except OSError:
            fcntl.ioctl(self._fd, I2C_SLAVE, self._addr)

    def _write_cmd_bytes(self, *cmd_bytes: int) -> None:
        for value in cmd_bytes:
            self._bind_slave()
            cmd = int(value) & 0xFF
            try:
                os.write(self._fd, bytes([self._cmd_control, cmd]))
            except OSError:
                # Some SH1107 variants reject the DISPLAY_ON command (0xAF)
                # even though the panel remains usable (you can see it working
                # via simple writes). In that case, ignore 0xAF and continue.
                if cmd == 0xAF:
                    alt = 0x80 if self._cmd_control == 0x00 else 0x00
                    try:
                        os.write(self._fd, bytes([alt, cmd]))
                        self._cmd_control = alt
                    except OSError:
                        continue
                else:
                    # Some modules expect 0x80 as the command control byte for
                    # single-byte command writes. Auto-fallback and keep using it.
                    alt = 0x80 if self._cmd_control == 0x00 else 0x00
                    os.write(self._fd, bytes([alt, cmd]))
                    self._cmd_control = alt
            if self._cmd_delay:
                time.sleep(self._cmd_delay)

    def _write_data(self, payload: bytes) -> None:
        step = self._data_chunk
        for i in range(0, len(payload), step):
            self._bind_slave()
            os.write(self._fd, bytes([self._data_control]) + payload[i : i + step])

    @property
    def size(self) -> tuple[int, int]:
        return (self.width, self.height)

    def clear(self) -> None:
        empty = Image.new("1", (self.width, self.height), 0)
        self.display(empty)

    def display(self, image: Image.Image) -> None:
        if image.size != (self.width, self.height):
            image = image.resize((self.width, self.height))
        if image.mode != "1":
            image = image.convert("L").point(lambda x: 0 if x < 128 else 255, mode="1")
        pixmap = image.load()
        for page in range(self._pages):
            buf = bytearray(self._pagelen)
            for x in range(self._pagelen):
                tmp = 0
                for y in range(8):
                    tmp |= int(pixmap[x, y + 8 * page] & 1) << y
                buf[x] = tmp
            xo = self._x_offset
            self._write_cmd_bytes(
                0x10 | ((xo >> 4) & 0x0F),
                xo & 0x0F,
                0xB0 | page,
            )
            self._write_data(bytes(buf))


EXPRESSION_PROFILE = {
    "neutral": {"openness": 0.62, "width_ratio": 0.34, "spacing": 0.19, "vertical_bias": 0.0},
    "happy": {"openness": 0.52, "width_ratio": 0.39, "spacing": 0.18, "vertical_bias": -0.08},
    "sad": {"openness": 0.38, "width_ratio": 0.31, "spacing": 0.21, "vertical_bias": 0.08},
    "thinking": {"openness": 0.44, "width_ratio": 0.27, "spacing": 0.23, "vertical_bias": -0.03},
    "surprised": {"openness": 0.86, "width_ratio": 0.30, "spacing": 0.18, "vertical_bias": -0.02},
    "listening": {"openness": 0.68, "width_ratio": 0.32, "spacing": 0.20, "vertical_bias": 0.0},
}

EXPRESSIONS = ["neutral", "happy", "sad", "thinking", "surprised", "listening"]


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


def _load_config(config_path: Path) -> Dict[str, Any]:
    if not config_path.exists():
        return {}
    return json.loads(config_path.read_text(encoding="utf-8"))


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


def _draw_single_eye_frame(
    width: int,
    height: int,
    expression: str,
    gaze_x: float,
    gaze_y: float,
    blink_factor: float,
    micro_phase: float,
    *,
    eye_side: str,
) -> Image.Image:
    """Render one full-screen eye for dual-panel setups."""
    profile = EXPRESSION_PROFILE.get(expression, EXPRESSION_PROFILE["neutral"])
    openness = _clamp(profile["openness"] * (1.0 - blink_factor), 0.08, 0.95)
    vertical_bias = _clamp(profile["vertical_bias"], -0.25, 0.25)

    # Single-eye panels should use a wider eye than the shared single-screen mode.
    eye_w = int(width * _clamp(profile["width_ratio"] * 1.9, 0.45, 0.88))
    eye_h = int(height * openness * 0.60)
    radius = max(2, int(min(eye_w, eye_h) * 0.36))

    # Slight binocular feel: move left/right eye subtly in opposite horizontal direction.
    side = str(eye_side).lower().strip()
    side_parallax = -0.012 if side == "left" else 0.012
    gaze_dx = int((gaze_x + side_parallax) * width * 0.12)
    gaze_dy = int(gaze_y * height * 0.10)
    cy = int(height * (0.5 + vertical_bias + (math.sin(micro_phase) * 0.02))) + gaze_dy
    cx = (width // 2) + gaze_dx

    img = Image.new("RGB", (width, height), "black")
    draw = ImageDraw.Draw(img)
    box = [cx - eye_w // 2, cy - eye_h // 2, cx + eye_w // 2, cy + eye_h // 2]
    draw.rounded_rectangle(box, radius=radius, fill="white")
    return img


def _init_oled_from_settings(oled_cfg: Dict[str, Any]) -> Any:
    interface = str(oled_cfg.get("interface", "i2c")).lower()
    port = int(oled_cfg.get("i2c_port", 1))
    addr = int(str(oled_cfg.get("i2c_address", "0x3C")), 16)
    spi_port = int(oled_cfg.get("spi_port", 0))
    spi_device = int(oled_cfg.get("spi_device", 0))
    spi_gpio_dc = int(oled_cfg.get("spi_gpio_dc", 24))
    spi_gpio_rst = int(oled_cfg.get("spi_gpio_rst", 25))
    spi_bus_speed_hz = int(oled_cfg.get("spi_bus_speed_hz", 8_000_000))
    width = int(oled_cfg.get("width", 128))
    height = int(oled_cfg.get("height", 128))
    rotate = int(oled_cfg.get("rotate", 0))
    driver = str(oled_cfg.get("oled_driver", "ssd1351")).lower()
    display_offset = int(oled_cfg.get("display_offset", 0))
    column_x_offset = oled_cfg.get("column_x_offset")
    if column_x_offset is not None:
        column_x_offset = int(column_x_offset)
    sh1107_use_d3 = bool(oled_cfg.get("sh1107_use_d3", False))
    cmd_byte_delay_s = float(oled_cfg.get("cmd_byte_delay_s", 0.0))
    data_chunk = int(oled_cfg.get("data_chunk", 16))
    cmd_control = int(str(oled_cfg.get("cmd_control", "0x00")), 16)
    data_control = int(str(oled_cfg.get("data_control", "0x40")), 16)

    if driver == "sh1107" and interface == "i2c":
        return Sh1107NativeI2C(
            i2c_port=port,
            address=addr,
            width=width,
            height=height,
            rotate=rotate,
            display_offset=display_offset,
            column_x_offset=column_x_offset,
            sh1107_use_d3=sh1107_use_d3,
            cmd_byte_delay_s=cmd_byte_delay_s,
            data_chunk=data_chunk,
            cmd_control=cmd_control,
            data_control=data_control,
        )
    if not LUMA_AVAILABLE:
        raise RuntimeError("luma.oled not available")

    if interface == "spi":
        serial = spi(
            port=spi_port,
            device=spi_device,
            gpio_DC=spi_gpio_dc,
            gpio_RST=spi_gpio_rst,
            bus_speed_hz=spi_bus_speed_hz,
        )
    else:
        serial = i2c(port=port, address=addr)
    safe_i2c = bool(oled_cfg.get("safe_i2c", True))

    if interface == "i2c" and safe_i2c:
        bus_fd = serial._bus.fd
        addr7 = int(serial._addr)

        def _raw_i2c_write(control: int, payload: bytes) -> None:
            fcntl.ioctl(bus_fd, I2C_SLAVE, addr7)
            os.write(bus_fd, bytes([control & 0xFF]) + payload)

        def _safe_command(*cmd: int) -> None:
            # Some SH110x modules are very strict and NACK multi-byte command frames.
            # Send one command byte per I2C transaction for maximum compatibility.
            for value in cmd:
                _raw_i2c_write(serial._cmd_mode, bytes([int(value) & 0xFF]))

        def _safe_data(data: Iterable[Any]) -> None:
            # Also use byte-wise data writes for strict controllers/buses.
            for value in data:
                _raw_i2c_write(serial._data_mode, bytes([int(value) & 0xFF]))

        serial.command = _safe_command
        serial.data = _safe_data

    # Support a couple common controllers for physical testing.
    if driver == "ssd1351":
        return ssd1351(serial_interface=serial, width=width, height=height, rotate=rotate)
    if driver == "sh1106":
        sh1106_cls = getattr(oled_device_mod, "sh1106", None)
        if sh1106_cls is None:
            raise RuntimeError("luma.oled sh1106 driver not available in this environment")
        return sh1106_cls(serial_interface=serial, width=width, height=height, rotate=rotate)
    if driver == "sh1107":
        # Monochrome 128x128 SPI modules (common blue 7-pin boards) use SH1107, not SSD1351.
        # Using ssd1351 driver on SH1107 hardware shows random/static pixels.
        sh1107_cls = getattr(oled_device_mod, "sh1107", None)
        if sh1107_cls is None:
            raise RuntimeError("luma.oled sh1107 driver not available in this environment")
        return sh1107_cls(serial_interface=serial, width=width, height=height, rotate=rotate)

    raise RuntimeError(f"Unsupported oled_driver={driver!r}")


def _init_oled(cfg: Dict[str, Any]) -> Any:
    return _init_oled_from_settings(cfg.get("oled", {}))


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="test_config.json")
    parser.add_argument("--duration", type=float, default=3.0)
    parser.add_argument("--expression", default="auto", help="neutral|happy|sad|thinking|surprised|listening|auto")
    parser.add_argument("--gaze_x", type=float, default=0.0)
    parser.add_argument("--gaze_y", type=float, default=0.0)
    args = parser.parse_args()

    cfg = _load_config(Path(args.config))
    dual_mode = isinstance(cfg.get("oled_left"), dict) and isinstance(cfg.get("oled_right"), dict)
    oled_cfg = cfg.get("oled", {})
    print(
        "OLED config: interface={} driver={} spi_port={} spi_device={} dc={} rst={}".format(
            str(oled_cfg.get("interface", "i2c")).lower(),
            str(oled_cfg.get("oled_driver", "ssd1351")).lower(),
            oled_cfg.get("spi_port", 0),
            oled_cfg.get("spi_device", 0),
            oled_cfg.get("spi_gpio_dc", 24),
            oled_cfg.get("spi_gpio_rst", 25),
        )
    )
    drv = str(cfg.get("oled", {}).get("oled_driver", "ssd1351")).lower()
    intf = str(cfg.get("oled", {}).get("interface", "i2c")).lower()
    # Native SH1107 (no luma) is I2C-only; SPI SH1107 and all other drivers need luma.
    if not LUMA_AVAILABLE and not (drv == "sh1107" and intf == "i2c"):
        print("ERROR: luma.oled not available. Install deps, or use oled_driver \"sh1107\" with interface \"i2c\".")
        return 2

    gaze_x = _clamp(args.gaze_x, -1.0, 1.0)
    gaze_y = _clamp(args.gaze_y, -1.0, 1.0)
    duration = max(0.0, float(args.duration))

    device = None
    left_device = None
    right_device = None
    if dual_mode:
        left_cfg = cfg.get("oled_left", {})
        right_cfg = cfg.get("oled_right", {})
        print(
            "Dual OLED config: LEFT spi_device={} dc={} rst={} | RIGHT spi_device={} dc={} rst={}".format(
                left_cfg.get("spi_device", 0),
                left_cfg.get("spi_gpio_dc", 24),
                left_cfg.get("spi_gpio_rst", 25),
                right_cfg.get("spi_device", 1),
                right_cfg.get("spi_gpio_dc", 23),
                right_cfg.get("spi_gpio_rst", 22),
            )
        )
        left_device = _init_oled_from_settings(left_cfg)
        right_device = _init_oled_from_settings(right_cfg)
        print(
            "Dual OLED init OK: LEFT {}x{} RIGHT {}x{}".format(
                int(left_device.width),
                int(left_device.height),
                int(right_device.width),
                int(right_device.height),
            )
        )
    else:
        device = _init_oled(cfg)
        width = int(device.width)
        height = int(device.height)
        print(f"OLED init OK: {width}x{height} rotate={getattr(device, 'rotate', None)}")

    eye_layout = str(oled_cfg.get("eye_layout", "horizontal")).lower()
    eyes_bias_x = _clamp(float(oled_cfg.get("eyes_bias_x", 0.0)), -1.0, 1.0)
    if not dual_mode:
        print(f"Eyes: layout={eye_layout} eyes_bias_x={eyes_bias_x} (negative = shift left)")

    start = time.monotonic()
    next_blink_at = start + random.uniform(0.8, 1.6)
    frame_delay = 0.05

    expr_fixed = str(args.expression).lower()
    expr_auto = expr_fixed == "auto"

    try:
        while True:
            now = time.monotonic()
            elapsed = now - start
            if elapsed >= duration:
                break

            if expr_auto:
                # Cycle expressions slowly over duration.
                idx = int((elapsed / max(duration, 1e-6)) * len(EXPRESSIONS))
                expr = EXPRESSIONS[min(max(idx, 0), len(EXPRESSIONS) - 1)]
            else:
                expr = expr_fixed

            blink_factor = 0.0
            if next_blink_at <= now <= (next_blink_at + 0.12):
                progress = (now - next_blink_at) / 0.12
                blink_factor = 1.0 - abs((progress * 2.0) - 1.0)
            elif now > (next_blink_at + 0.12):
                next_blink_at = now + random.uniform(1.0, 2.5)

            if dual_mode:
                lw = int(left_device.width)
                lh = int(left_device.height)
                rw = int(right_device.width)
                rh = int(right_device.height)
                left_img = _draw_single_eye_frame(
                    lw,
                    lh,
                    expr,
                    gaze_x,
                    gaze_y,
                    blink_factor,
                    elapsed * 3.0,
                    eye_side="left",
                )
                right_img = _draw_single_eye_frame(
                    rw,
                    rh,
                    expr,
                    gaze_x,
                    gaze_y,
                    blink_factor,
                    elapsed * 3.0,
                    eye_side="right",
                )
                await asyncio.gather(
                    asyncio.to_thread(left_device.display, _prep_image_for_device(left_img, left_device)),
                    asyncio.to_thread(right_device.display, _prep_image_for_device(right_img, right_device)),
                )
            else:
                image = _draw_frame(
                    width=width,
                    height=height,
                    expression=expr,
                    gaze_x=gaze_x,
                    gaze_y=gaze_y,
                    blink_factor=blink_factor,
                    micro_phase=elapsed * 3.0,
                    eye_layout=eye_layout,
                    eyes_bias_x=eyes_bias_x,
                )
                await asyncio.to_thread(device.display, _prep_image_for_device(image, device))
            await asyncio.sleep(frame_delay)

        # Leave a neutral frame at the end.
        if dual_mode:
            left_img = _draw_single_eye_frame(
                int(left_device.width),
                int(left_device.height),
                "neutral",
                gaze_x,
                gaze_y,
                0.0,
                0.0,
                eye_side="left",
            )
            right_img = _draw_single_eye_frame(
                int(right_device.width),
                int(right_device.height),
                "neutral",
                gaze_x,
                gaze_y,
                0.0,
                0.0,
                eye_side="right",
            )
            await asyncio.gather(
                asyncio.to_thread(left_device.display, _prep_image_for_device(left_img, left_device)),
                asyncio.to_thread(right_device.display, _prep_image_for_device(right_img, right_device)),
            )
        else:
            final_img = _draw_frame(
                width,
                height,
                "neutral",
                gaze_x,
                gaze_y,
                0.0,
                0.0,
                eye_layout=eye_layout,
                eyes_bias_x=eyes_bias_x,
            )
            await asyncio.to_thread(device.display, _prep_image_for_device(final_img, device))
        return 0
    finally:
        for dev in (left_device, right_device, device):
            if dev is None:
                continue
            try:
                await asyncio.to_thread(dev.clear)
            except Exception:
                pass
            if isinstance(dev, Sh1107NativeI2C):
                dev.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

