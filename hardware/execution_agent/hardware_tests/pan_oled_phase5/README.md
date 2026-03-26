Pan+Eyes Physical Test (Phase 5)
================================

This folder is meant to be copied to your Raspberry Pi *as-is*.
It provides two small scripts:
- `test_pan_servo.py`: sweep the pan servo and verify clamping + movement
- `test_oled_eyes.py`: render procedural (code-generated) eyes to the OLED

Files you should upload/copy:
- `test_pan_servo.py`
- `test_oled_eyes.py`
- `test_config.json`
- `requirements.txt`
- this `README.md`

1) Copy to the Pi
-------------------
From your dev machine, run something like:

```bash
scp -r "execution_agent/hardware_tests/pan_oled_phase5" pi@<PI_IP>:~/
```

Then `cd` into the folder on the Pi:

```bash
cd ~/pan_oled_phase5
```

2) Install dependencies
------------------------
```bash
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

If you already have them installed system-wide, this can be skipped.

3) Edit `test_config.json` (if needed)
---------------------------------------
Defaults match the repo `execution_agent/config.json`.
If your wiring differs, update:
- `gpio.servo_pan_pin`
- `gpio.servo_min_pulse_width` / `gpio.servo_max_pulse_width`
- `oled.interface` (`i2c` or `spi`)
- `oled.i2c_address` / `oled.rotate` / `oled_driver` (if needed)
- SPI modules: `oled.spi_port`, `oled.spi_device`, `oled.spi_gpio_dc`, `oled.spi_gpio_rst`
- **Orientation:** `oled.rotate` — luma uses `0..3` (steps of 90° clockwise). Try `1`, `2`, or `3` if the face is sideways in your enclosure.
- **Eye position:** `oled.eye_layout` — `horizontal` (default) or `vertical` (stacked, good for portrait mounts). `oled.eyes_bias_x` — `-1.0`..`1.0`; **negative shifts both eyes left**, positive shifts right.

4) Test the pan servo
----------------------
```bash
python3 test_pan_servo.py
```

Optional flags:
- `--duration_s` (default: sweep once)
- `--pan_min`, `--pan_max`, `--step_deg`
- `--speed` (`slow|normal|fast`)

5) Test the OLED (eyes)
------------------------
```bash
python3 test_oled_eyes.py --duration 5.0 --expression neutral
```

Optional flags:
- `--duration` seconds (default: 3.0)
- `--expression` one of `neutral|happy|sad|thinking|surprised|listening` (default: auto cycle)
- `--gaze_x`, `--gaze_y` in range `[-1.0, 1.0]`

6) Troubleshooting quick checks
--------------------------------
Servo issues:
- Double-check the servo signal wire is on the BCM pin you set in `gpio.servo_pan_pin`.
- Ensure the servo has a suitable 5V supply (do not power servos from the Pi directly if unstable).

OLED issues:

- **`ModuleNotFoundError: No module named 'RPi'`** (SPI path): install GPIO support in the same venv — `pip install RPi.GPIO` (also listed in `requirements.txt`). Luma uses **RPi.GPIO** for SPI **DC** and **RST** lines.

- **Static / snow on a 128x128 blue 7-pin SPI board:** that panel is almost always **SH1107** (monochrome), not **SSD1351** (color). Use `"oled_driver": "sh1107"` with `"interface": "spi"`. Using `ssd1351` on SH1107 hardware produces garbage pixels.
- Confirm I2C is enabled: `sudo raspi-config` -> Interface Options -> I2C -> Enable.
- Confirm the OLED address (common is `0x3C` or `0x3D`).
- **`GME128128-01` / 1.5\" SH1107 IIC:** use `"oled_driver": "sh1107"`. The script uses
  the **u8g2** `SH1107 128x128` init (not luma/Adafruit). Set `"column_x_offset": 96`
  (default); if the image is horizontally wrong, try **`0`** (see u8g2 issue \#2581).
- Permissions: user must access `/dev/i2c-*` — `sudo usermod -aG i2c $USER` then re-login,
  or run once with `sudo` to verify.
- Slow bus: in `/boot/firmware/config.txt` add `dtparam=i2c_arm_baudrate=50000` and reboot.
- If your display controller is not SSD1351, set `oled_driver` in `test_config.json`:
  - `ssd1351` (default)
  - `sh1106`

