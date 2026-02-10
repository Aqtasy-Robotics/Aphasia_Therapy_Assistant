# Aphasia Therapy Robot — Execution Agent v1

A Python-based execution agent that runs on a **Raspberry Pi 4**, communicates with a FastAPI backend over HTTP, and controls local hardware to deliver interactive aphasia therapy sessions.

| Component | Technology |
|-----------|-----------|
| TTS | Piper TTS (local ONNX) |
| Comms | HTTP REST polling (httpx → FastAPI) |
| Mic / Speaker | sounddevice + numpy |
| 7" Touch UI | Kivy (framebuffer / KMS) |
| 1.5" OLED Face | luma.oled (I2C) |
| Head Servos | gpiozero (GPIO 17 pan, GPIO 27 tilt) |

---

## Project Structure

```
execution_agent_v1/
├── .env                       # Server URL, Device ID, model paths
├── config.json                # Polling rates, GPIO pins, volume, OLED addr
├── requirements.txt           # Python dependencies
├── main.py                    # Entry point & orchestrator
├── models/                    # Piper ONNX model files
│   └── en_US-lessac-medium.onnx
├── src/
│   ├── settings.py            # Pydantic settings loader
│   ├── dispatcher.py          # Command → driver router
│   ├── communication/
│   │   ├── api_client.py      # HTTP polling client
│   │   └── models.py          # ExecutionCommand / CommandAck schemas
│   ├── services/
│   │   ├── ear.py             # Microphone input (sounddevice)
│   │   ├── mouth.py           # Piper TTS + speaker output
│   │   ├── face.py            # OLED face expressions (luma.oled)
│   │   └── head.py            # Servo head movement (gpiozero)
│   └── ui/
│       ├── body_app.py        # Kivy 7" touch dashboard
│       └── dashboard.kv       # Kivy layout file
├── assets/
│   ├── images/                # Face PNGs, therapy images
│   └── audio/                 # Sound effects
└── scripts/
    ├── install_dependencies.sh  # One-shot Pi setup
    └── robot.service            # systemd service unit
```

---

## Prerequisites

- **Raspberry Pi 4** (4 GB+ recommended) running **Raspberry Pi OS Lite** (Bookworm 64-bit)
- Python **3.10+** (ships with Bookworm)
- I2C enabled (`sudo raspi-config` → Interface Options → I2C → Enable)
- SPI enabled if using SPI OLED variant
- Official 7" touchscreen connected via DSI
- USB microphone + 3.5 mm / USB speaker

---

## Installation on Raspberry Pi

### 1. Clone the Repository

```bash
cd ~
git clone <your-repo-url> execution_agent_v1
cd execution_agent_v1
```

### 2. Run the System Dependencies Script

```bash
chmod +x scripts/install_dependencies.sh
sudo scripts/install_dependencies.sh
```

This installs the following apt packages (among others):

| Package | Purpose |
|---------|---------|
| `python3-venv` | Virtual environment support |
| `libportaudio2`, `portaudio19-dev` | PortAudio for sounddevice |
| `libatlas-base-dev` | Optimised BLAS for numpy on ARM |
| `libjpeg-dev`, `libpng-dev` | Image libraries for Pillow |
| `libsdl2-dev`, `libsdl2-image-dev`, `libsdl2-mixer-dev`, `libsdl2-ttf-dev` | SDL2 for Kivy |
| `i2c-tools`, `python3-smbus` | I2C for OLED |
| `libgpiod2` | GPIO for gpiozero |
| `espeak-ng` | Fallback TTS phonemiser (used by Piper) |

### 3. Create a Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note:** On the Pi, `numpy` and `scipy` will build from wheels — this can take a few minutes on first install.

### 5. Download the Piper TTS Model

```bash
mkdir -p models
# English (US) — lessac medium quality (recommended for Pi 4)
wget -O models/en_US-lessac-medium.onnx \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx

wget -O models/en_US-lessac-medium.onnx.json \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

### 6. Configure Environment Variables

```bash
cp .env.example .env   # or edit .env directly
nano .env
```

Update these values:

```dotenv
SERVER_URL=http://<your-server-ip>:8000
DEVICE_ID=robot-pi-001
```

### 7. Test the Agent (Mock Mode)

```bash
python main.py
```

On a laptop (no hardware), all drivers fall back to mock mode automatically. You should see log output like:

```
INFO  | Execution Agent v1 starting...
INFO  | Device: robot-pi-001
INFO  | Server: http://192.168.1.100:8000
INFO  | Drivers loaded (mock mode): ear, mouth, face, head, body
INFO  | Entering polling loop...
```

---

## Running as a System Service

### Install the systemd Unit

```bash
sudo cp scripts/robot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable robot.service
sudo systemctl start robot.service
```

### Check Logs

```bash
sudo journalctl -u robot.service -f
```

---

## Development (on Laptop)

You can develop and test on any Linux/macOS/Windows machine. Hardware-dependent libraries (`gpiozero`, `luma.oled`) are automatically mocked when imports fail.

```bash
# Clone & set up
git clone <your-repo-url> execution_agent_v1
cd execution_agent_v1
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run with mock drivers
python main.py
```

---

## Configuration Reference

### `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVER_URL` | FastAPI backend base URL | `http://192.168.1.100:8000` |
| `DEVICE_ID` | Unique robot identifier | `robot-pi-001` |
| `PIPER_MODEL_PATH` | Path to Piper ONNX model | `models/en_US-lessac-medium.onnx` |
| `PIPER_MODEL_CONFIG` | Path to Piper model config JSON | `models/en_US-lessac-medium.onnx.json` |
| `LOG_LEVEL` | Logging verbosity | `DEBUG` / `INFO` / `WARNING` |

### `config.json`

| Section | Key | Default | Description |
|---------|-----|---------|-------------|
| `polling` | `interval_seconds` | `2.0` | How often to poll the server |
| `polling` | `timeout_seconds` | `5.0` | HTTP request timeout |
| `polling` | `max_retries` | `3` | Retries before back-off |
| `audio` | `sample_rate` | `22050` | Recording/playback sample rate |
| `audio` | `channels` | `1` | Mono |
| `audio` | `volume` | `0.8` | Playback gain (0.0–1.0) |
| `gpio` | `servo_pan_pin` | `17` | BCM pin for pan servo |
| `gpio` | `servo_tilt_pin` | `27` | BCM pin for tilt servo |
| `oled` | `i2c_address` | `0x3C` | OLED I2C address |
| `oled` | `width` / `height` | `128` / `128` | OLED resolution |
| `display` | `width` / `height` | `800` / `480` | Kivy display resolution |

---

## Wiring Diagram (Quick Reference)

```
Raspberry Pi 4 GPIO Header
──────────────────────────
Pin 1  (3.3V)     → OLED VCC
Pin 3  (GPIO 2)   → OLED SDA  (I2C Data)
Pin 5  (GPIO 3)   → OLED SCL  (I2C Clock)
Pin 6  (GND)      → OLED GND
Pin 11 (GPIO 17)  → Pan Servo Signal   (Orange wire)
Pin 13 (GPIO 27)  → Tilt Servo Signal  (Orange wire)
Pin 2  (5V)       → Servo VCC          (Red wire, via external 5V supply recommended)
Pin 14 (GND)      → Servo GND          (Brown wire)
USB Port          → USB Microphone
3.5mm Jack / USB  → Speaker
DSI Port          → 7" Official Touchscreen
```

**Important:** Power servos from an external 5V supply to avoid brownouts on the Pi. Share a common ground with the Pi.

---

## License

This project is for academic / research use as part of the Aphasia Therapy Robot system.
