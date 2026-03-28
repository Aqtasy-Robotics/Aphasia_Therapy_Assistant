# Aphasia Therapy Robot — Execution Agent v1

A Python-based execution agent that runs on a **Raspberry Pi 4**, communicates with a FastAPI backend over HTTP, and controls local hardware to deliver interactive aphasia therapy sessions.

> 📋 **For detailed implementation phases and development roadmap, see [`implementation_plan.md`](implementation_plan.md).**

| Component | Technology |
|-----------|-----------|
| TTS | Piper TTS (local ONNX) |
| Comms | HTTP REST polling (httpx → FastAPI) |
| Mic / Speaker | sounddevice + numpy |
| 7" Touch UI | Kivy (framebuffer / KMS) |
| 1.5" OLED Face | luma.oled (I2C or SPI) |
| Head Servos | gpiozero (GPIO 17 pan, GPIO 27 tilt) |

---

## Project Structure

```
execution_agent/
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
│       └── body_app.kv        # Kivy layout file
├── assets/
│   ├── images/                # Face PNGs, therapy images
│   └── audio/                 # Sound effects
└── scripts/
    ├── install_dependencies.sh  # One-shot Pi setup (apt + venv)
    ├── install_portaudio_apt.sh # Debian/Ubuntu: PortAudio for mic (dev laptop)
    ├── setup.sh                 # Python virtualenv + pip requirements
    ├── run_agent_desktop.sh     # Pi Desktop: main.py + Kivy UI env vars
    ├── aphasia-robot-agent.desktop  # Template launcher (edit paths)
    └── robot.service            # systemd service unit
```

---

## Prerequisites

- **Raspberry Pi 4** (4 GB+ recommended) running **Raspberry Pi OS Lite** (Bookworm 64-bit)
- Python **3.10+** (ships with Bookworm)
- I2C enabled (`sudo raspi-config` → Interface Options → I2C → Enable) when using I2C OLED
- SPI enabled (`sudo raspi-config` → Interface Options → SPI → Enable) when using SPI OLED
- Official 7" touchscreen connected via DSI
- USB microphone + 3.5 mm / USB speaker

---

## Local MCP Server (STDIO)

You can expose local hardware controls as MCP tools for desktop agents.

### Install dependency

```bash
pip install -r requirements.txt
```

### Start MCP server

From `hardware/execution_agent`:

```bash
python -m mcp_server
```

### Tools exposed (v1)

- `health_check`
- `audio_list_devices`
- `audio_listen`
- `audio_speak`
- `ui_start`
- `ui_show`
- `ui_events_read`
- `ui_ready`

### Remote Raspberry Pi (via FastAPI bridge)

Use these from the **laptop** so commands run on the **Pi** (speaker, mic, Kivy). The bridge must be running (`uvicorn backend.main:app`) and the Pi must run `python main.py` with `SERVER_URL` pointing at that bridge.

- `bridge_health_remote`
- `bridge_enqueue_command`
- `bridge_speak_on_robot`
- `bridge_listen_on_robot`
- `bridge_show_ui_on_robot`

Full setup: **[`docs/BRIDGE_AND_MCP.md`](docs/BRIDGE_AND_MCP.md)**.

### Example MCP client command config

```json
{
  "mcpServers": {
    "waabi-hardware-local": {
      "command": "python",
      "args": ["-m", "mcp_server"],
      "cwd": "C:/Users/USER/Desktop/Aqtasy Robotics/Aphasia_Therapy_Assistant/hardware/execution_agent"
    }
  }
}
```

---

## Installation on Raspberry Pi

### 1. Clone the Repository

```bash
cd ~
git clone <your-repo-url> execution_agent
cd execution_agent
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
bash scripts/setup.sh
source .venv/bin/activate
```

> **Note:** On the Pi, `numpy` and `scipy` will build from wheels — this can take a few minutes on first install.

### 4. Download the Piper TTS Model

```bash
mkdir -p models
# English (US) — lessac medium quality (recommended for Pi 4)
wget -O models/en_US-lessac-medium.onnx \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx

wget -O models/en_US-lessac-medium.onnx.json \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

### 5. Configure Environment Variables

Create a `.env` file at the project root:

```bash
nano .env
```

Minimum variables:

```dotenv
SERVER_URL=http://<your-server-ip>:8000
DEVICE_ID=robot-pi-001
PIPER_MODEL_PATH=/home/pi/execution_agent/models/en_US-lessac-medium.onnx
LOG_LEVEL=INFO
```

### 6. Test the Agent (Phase-by-Phase)

The project is designed to be tested incrementally on the Pi, following the phases outlined in `implementation_plan.md`. This allows you to verify each component before moving to the next.

#### Phase 1: Mock Drivers (No Hardware Required)

Test that the agent boots and all drivers initialize in mock mode:

```bash
python main.py
```

**Expected output:**
```
INFO  | Execution Agent starting…
INFO  | Device: robot-pi-001
INFO  | Server: http://192.168.1.100:8000
INFO  | Drivers loaded (mock mode): ear, mouth, face, head, body
INFO  | Entering idle loop with interval=2.0 s…
```

**Verification checklist:**
- [ ] Agent starts without errors
- [ ] All drivers report "mock mode" in logs
- [ ] Settings load correctly from `.env` and `config.json`
- [ ] Graceful shutdown works (Ctrl+C)

#### Phase 2: API Client & Polling (Requires FastAPI Backend)

**Prerequisites:** A FastAPI backend server running and accessible at `SERVER_URL`.

Test that the agent can poll for commands and send acknowledgements:

```bash
python main.py
```

**Expected behavior:**
- Agent polls `GET /commands/{device_id}` every 2 seconds
- Logs show connection status to the backend
- Commands are received and dispatched (still using mock drivers)
- Acknowledgements are sent back to the server

**Verification checklist:**
- [ ] Agent successfully connects to backend (check `/health` endpoint)
- [ ] Polling loop runs without errors
- [ ] Commands are received and logged
- [ ] Mock drivers execute commands (logged, not hardware)
- [ ] Acknowledgements are sent to `/status` endpoint

**Test with a simple backend:**
```python
# On your laptop/server, run a test FastAPI server
from fastapi import FastAPI
app = FastAPI()

@app.get("/commands/robot-pi-001")
def get_command():
    return {"command_id": "test-1", "action": "speak", "payload": {"text": "Hello"}}

@app.post("/status")
def post_status(ack: dict):
    print(f"Received: {ack}")
    return {"ok": True}
```

#### Phase 3: Audio Hardware (Requires USB Mic + Speaker)

**Prerequisites:** USB microphone and speaker connected to the Pi.

Test real audio input/output:

```bash
python main.py
```

**Verification checklist:**
- [ ] `mouth.speak("Hello")` plays audio through speaker
- [ ] `ear.listen(5)` records 5 seconds from microphone
- [ ] Audio sample rate matches `config.json` (22050 Hz)
- [ ] Piper TTS model loads successfully (< 5 seconds)
- [ ] Recorded audio can be uploaded to backend

**Test commands:**
- Send a `speak` command from backend → verify audio plays
- Send a `listen` command → verify recording works and uploads

#### Phase 4: Kivy UI (Requires 7" Touchscreen)

**Prerequisites:** Official 7" Raspberry Pi touchscreen connected via DSI.

Test the touchscreen dashboard:

```bash
# Ensure display is configured for KMS/DRM
export KIVY_WINDOW=sdl2
export KIVY_GL_BACKEND=sdl2
python main.py
```

**Verification checklist:**
- [ ] Kivy app launches fullscreen on 7" display
- [ ] `show_ui` command updates screen content
- [ ] Touch input is responsive
- [ ] App runs alongside polling loop without blocking

#### Phase 5: GPIO & OLED (Requires Servos + OLED Display)

**Prerequisites:**
- Pan/tilt servos connected to GPIO 17 and 27
- OLED display connected via I2C (address 0x3C)
- I2C enabled: `sudo raspi-config` → Interface Options → I2C → Enable

Test physical hardware:

```bash
# Verify I2C connection first
sudo i2cdetect -y 1  # Should show OLED at 0x3C

python main.py
```

**Verification checklist:**
- [ ] `head.move(pan=45, tilt=0)` physically rotates pan servo
- [ ] `face.show("happy")` displays expression on OLED
- [ ] GPIO pins match `config.json` values
- [ ] Servos respect safety limits (no jitter at rest)
- [ ] OLED initializes cleanly and recovers from bus errors

**Test commands:**
- `move_head` with various pan/tilt values
- `show_face` with different expressions (happy, sad, neutral, etc.)

---

## Testing on Laptop (Development Mode)

You can develop and test on any Linux/macOS/Windows machine. Hardware-dependent libraries (`gpiozero`, `luma.oled`) are automatically mocked when imports fail.

```bash
# Clone & set up
git clone <your-repo-url> execution_agent
cd execution_agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run with mock drivers (Phase 1 equivalent)
python main.py
```

All drivers will automatically fall back to mock mode, allowing you to test the full command flow without hardware.

### Microphone / `run_gui.py` — PortAudio required

The LangGraph session records audio with **`sounddevice`**, which needs the **PortAudio** system library. `run_gui.py` checks for PortAudio on startup and exits with instructions if it is missing.

**Debian / Ubuntu (one command):**

```bash
cd execution_agent   # folder containing main.py
sudo bash scripts/install_portaudio_apt.sh
```

Or manually: `sudo apt install -y libportaudio2 portaudio19-dev`

Then restart `run_gui.py`. The Pi image script [`scripts/install_dependencies.sh`](scripts/install_dependencies.sh) already includes these packages.

### LangGraph therapy session (`run_gui.py`)

[`run_gui.py`](run_gui.py) loads **repo-root** `../.env` before Kivy starts so **`GROQ_API`**, **`SUPABASE_URL`**, **`SUPABASE_SERVICE_KEY`**, etc. are available when you tap the mic and [`agentic/graph.py`](../agentic/graph.py) runs. Without a valid `.env`, perception (Groq) or Supabase lookups will fail.

From the **repository root** (parent of this folder), you can also use [`../scripts/run_gui_langgraph.sh`](../scripts/run_gui_langgraph.sh) to set `PYTHONPATH` and run the GUI.

### Desktop launcher (full agent + UI + backend)

1. Edit paths in [`scripts/aphasia-robot-agent.desktop`](scripts/aphasia-robot-agent.desktop) (`Exec` and `Path`) to match your install.
2. `chmod +x scripts/run_agent_desktop.sh scripts/aphasia-robot-agent.desktop`
3. Copy the `.desktop` file to `~/Desktop` or `~/.local/share/applications/`, then mark it trusted / allow executing.

[`run_agent_desktop.sh`](scripts/run_agent_desktop.sh) sets `EXECUTION_AGENT_START_UI=1`, Kivy SDL2 env vars, and runs `main.py` (requires `polling.enabled` and `.env` for FastAPI).

### UI events → FastAPI

When polling is enabled, touch events from Kivy are **POST**ed to **`POST /ui-events/{device_id}`** on the backend. The FastAPI app in [`backend/main.py`](../backend/main.py) logs them. Set **`BRIDGE_TEST_SHOW_UI=1`** on the server to return a test `show_ui` command from **`GET /commands/{device_id}`**.

---

## Running as a System Service

### Install the systemd Unit

Edit `scripts/robot.service` if needed so `WorkingDirectory`, `ExecStart`, and `User` match where you cloned the repo (paths must point at the folder that contains `main.py`, `config.json`, and `.venv`).

```bash
cd /home/pi/execution_agent   # your install path
sudo cp scripts/robot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable robot.service
sudo systemctl start robot.service
```

**OLED face on boot (no backend):** In `config.json` set `"polling": { "enabled": false, ... }` and `"oled": { "standalone_math_eyes": true, ... }` with the same SPI/SH1107 options as `hardware_tests/pan_oled_phase5/test_config.json` (`interface`, `oled_driver`, `rotate`, `eye_layout`, `eyes_bias_x`, GPIO pins). The agent’s main loop stays alive while the OLED task animates; `Restart=always` restarts the process if it ever crashes.

### Check Logs

```bash
sudo journalctl -u robot.service -f
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
| `polling` | `enabled` | `true` | Enable/disable backend polling loop |
| `polling` | `timeout_seconds` | `5.0` | HTTP request timeout |
| `polling` | `max_retries` | `3` | Retries before back-off |
| `audio` | `sample_rate` | `22050` | Recording/playback sample rate |
| `audio` | `channels` | `1` | Mono |
| `audio` | `volume` | `0.8` | Playback gain (0.0–1.0) |
| `gpio` | `servo_pan_pin` | `17` | BCM pin for pan servo |
| `gpio` | `servo_min_pulse_width` | `0.0005` | Pan servo minimum pulse width |
| `gpio` | `servo_max_pulse_width` | `0.0025` | Pan servo maximum pulse width |
| `oled` | `i2c_address` | `0x3C` | OLED I2C address |
| `oled` | `interface` | `i2c` | OLED bus interface (`i2c` or `spi`) |
| `oled` | `oled_driver` | `ssd1351` | Display controller driver |
| `oled` | `spi_port` / `spi_device` | `0` / `0` | Linux SPI bus and CS |
| `oled` | `spi_gpio_dc` / `spi_gpio_rst` | `24` / `25` | GPIO pins for D/C and RESET |
| `oled` | `standalone_math_eyes` | `false` | Run local eye animation without backend commands |
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

> ⚠️ **Important:** Power servos from an external 5V supply to avoid brownouts on the Pi. Share a common ground with the Pi.

### SPI OLED Quick Wiring (7-pin module)

For a 7-pin SPI OLED (`GND, VCC, D0, D1, RST, DC, CS`) on Raspberry Pi:

- `GND` -> Pi GND
- `VCC` -> Pi 3.3V (or module-safe 5V if your board supports it)
- `D0 (CLK)` -> GPIO11 / SPI0 SCLK (physical pin 23)
- `D1 (MOSI)` -> GPIO10 / SPI0 MOSI (physical pin 19)
- `RST` -> configurable GPIO (default in config: BCM 25 / physical pin 22)
- `DC` -> configurable GPIO (default in config: BCM 24 / physical pin 18)
- `CS` -> GPIO8 / SPI0 CE0 (physical pin 24, `spi_device=0`) or GPIO7 / CE1 (`spi_device=1`)

---

## License

This project is for academic / research use as part of the Aphasia Therapy Robot system.
