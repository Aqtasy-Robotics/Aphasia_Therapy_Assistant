# Aphasia Therapy Robot — Execution Agent: Implementation Plan

> **Target Hardware:** Raspberry Pi 4 (4 GB+), Pi OS Lite (headless, KMS/DRM)
> **Backend:** FastAPI server on a separate machine (laptop / desktop)
> **Communication:** HTTP REST polling (no MQTT)
> **All tools are free & open-source — no paid APIs.**

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Raspberry Pi 4                     │
│                                                      │
│  main.py (Entry Point / Orchestrator)                │
│    ├── api_client  ←── HTTP GET/POST ──→ FastAPI     │
│    ├── ear.py      ←── sounddevice (Mic)             │
│    ├── mouth.py    ──→ Piper TTS → sounddevice (Spk) │
│    ├── face.py     ──→ luma.oled (1.5" OLED eyes via code) │
│    ├── head.py     ──→ gpiozero (Pan Servo)         │
│    └── body_app.py ──→ Kivy (7" Touchscreen)        │
└──────────────────────────────────────────────────────┘
          ▲                          │
          │  HTTP GET /commands      │ HTTP POST /status
          │  (polling loop)          │ (ack / results)
          ▼                          ▼
┌──────────────────────────────────────────────────────┐
│            FastAPI Backend (Laptop / Server)          │
│   /commands/{device_id}   →  returns next command    │
│   /status                 ←  receives execution ack  │
└──────────────────────────────────────────────────────┘
```

### Execution Command Flow

1. `api_client` polls `GET /commands/{device_id}` every N seconds.
2. Server returns a JSON **Execution Command** (or empty/no-op).
3. `main.py` dispatches the command to the correct driver:
   - `"speak"` → `mouth.py` (Piper TTS → speaker)
   - `"listen"` → `ear.py` (record audio → POST back)
   - `"show_face"` → `face.py` (render expression on OLED)
   - `"move_head"` → `head.py` (servo pan)
   - `"show_ui"` → `body_app.py` (update Kivy screen)
4. Driver executes, then `api_client` POSTs an acknowledgement/result.

---

## Phase 1 — Environment, Dependencies & Configuration

**Goal:** Set up the project structure, install dependencies, and implement configuration management. The agent should load settings, validate configuration, and have a basic entry point ready for hardware integration in later phases.

### 1.1 Project Scaffolding

| Task | File(s) | Details |
|------|---------|---------|
| ✅ Create directory tree | (all dirs) | As shown in the file-structure diagram |
| ✅ Environment variables | `.env.example` | `SERVER_URL`, `DEVICE_ID`, `PIPER_MODEL_PATH`, `LOG_LEVEL` |
| ✅ Runtime config | `config.json` | Polling interval, GPIO pins, audio sample rate, volume, OLED address |
| ✅ Python deps | `requirements.txt` | httpx, python-dotenv, pydantic, sounddevice, numpy, scipy, piper-tts, gpiozero, luma.oled, luma.core, Pillow, kivy, loguru |
| ✅ System deps script | `scripts/install_dependencies.sh` | apt packages: `libportaudio2`, `libatlas-base-dev`, `libjpeg-dev`, `libsdl2-dev`, `i2c-tools`, etc. |
| ✅ systemd unit | `scripts/robot.service` | Runs `main.py` on boot, restart on failure |

### 1.2 Configuration & Settings Module

| Task | File(s) | Details |
|------|---------|---------|
| ✅ Settings dataclass | `src/settings.py` | Pydantic `BaseSettings` that reads `.env` + `config.json` |
| ✅ Validate on startup | `main.py` | Load settings, print summary, exit on bad config |

### 1.3 Entry Point (`main.py`)

| Task | Details |
|------|---------|
| ✅ Load `.env` and `config.json` via `Settings` | |
| ✅ Initialise logger (loguru, file + console) | |
| ✅ Print a startup banner with device ID & server URL | |
| ✅ Enter a dummy loop: `while True: sleep(polling_interval)` — placeholder for Phase 2 polling | |
| ✅ Graceful shutdown on `SIGINT` / `SIGTERM` | |

**Note:** Driver implementations (Ear, Mouth, Face, Head, Body) will be added in their respective phases (Phase 3 for audio, Phase 4 for UI, Phase 5 for GPIO/OLED).

### 1.4 Deliverables Checklist

- [x] `python main.py` runs successfully, loading and validating configuration.
- [x] `Settings` rejects missing `.env` values with clear error messages.
- [x] `install_dependencies.sh` installs all apt + pip packages on a fresh Pi.
- [x] `robot.service` is a valid systemd unit file.
- [x] Project structure is complete with all necessary directories.

---

## Phase 2 — FastAPI Client & Polling Logic

**Goal:** The Pi continuously polls the FastAPI backend, receives Execution Commands, dispatches them, and returns acknowledgements.

### 2.1 Data Models

| Task | File(s) | Details |
|------|---------|---------|
| `ExecutionCommand` model | `src/communication/models.py` | Pydantic model: `command_id`, `action` (enum: speak / listen / show_face / move_head / show_ui), `payload` (dict), `timestamp` |
| `CommandAck` model | same | `command_id`, `device_id`, `status` (success / error), `result` (optional dict), `timestamp` |

### 2.2 API Client

| Task | File | Details |
|------|------|---------|
| `ApiClient` class | `src/communication/api_client.py` | Uses `httpx.AsyncClient` with connection pooling |
| `poll_command()` | same | `GET /commands/{device_id}` → returns `ExecutionCommand` or `None` |
| `send_ack()` | same | `POST /status` with `CommandAck` JSON body |
| `send_audio()` | same | `POST /audio/{device_id}` multipart upload of recorded WAV |
| Retry logic | same | Exponential back-off on connection errors (configurable max retries) |
| Health-check | same | `GET /health` — logged at startup to confirm server is reachable |

### 2.3 Command Dispatcher

| Task | File | Details |
|------|------|---------|
| `Dispatcher` class | `src/dispatcher.py` | Maps `action` string → driver method |
| Register drivers | `main.py` | Register real async driver functions from `src/services/mouth.py`, `src/services/ear.py`, `src/services/face.py`, `src/services/head.py`, and `src/ui/body_app.py` into `Dispatcher` using `ActionEnum` values. |
| Execute + ack | same | Await driver method, catch exceptions, return `CommandAck` |

### 2.4 Polling Loop (in `main.py`)

```
while running:
    cmd = await api_client.poll_command()
    if cmd:
        ack = await dispatcher.execute(cmd)
        await api_client.send_ack(ack)
    await asyncio.sleep(settings.polling.interval_seconds)
```

### 2.5 Deliverables Checklist

- [ ] With a simple FastAPI test server returning canned commands, the Pi receives, dispatches, and acks commands.
- [x] Retry logic handles server downtime gracefully (logs warning, keeps retrying).
- [x] `Dispatcher` routes every action type to the correct driver (drivers will be implemented in Phases 3-5).
- [ ] Audio upload endpoint works (tested with a dummy WAV).

---

## Phase 3 — Hardware Integration: Piper TTS & Audio

**Goal:** Implement the Ear and Mouth drivers with real audio hardware using Piper TTS and `sounddevice`.

### 3.1 Piper TTS Setup

| Task | Details |
|------|---------|
| Download ONNX model | `scripts/install_dependencies.sh` downloads `en_US-lessac-medium.onnx` + `.json` into `models/` |
| `mouth.speak(text)` | In `src/services/mouth.py`: load Piper model, synthesise to numpy array, play via `sounddevice.play()` |
| Volume control | Apply gain from `config.json` before playback |
| Async wrapper | Run synthesis in `asyncio.to_thread()` to avoid blocking the polling loop |

### 3.2 Microphone Recording

| Task | Details |
|------|---------|
| `ear.listen(duration_s)` | In `src/services/ear.py`: `sounddevice.rec()` → numpy array → WAV bytes |
| Silence detection (stretch) | Optionally stop early if silence detected for > 1 s |
| Return format | Returns `io.BytesIO` WAV for upload via `api_client.send_audio()` |

### 3.3 Audio Device Selection

| Task | Details |
|------|---------|
| Auto-detect | List devices with `sounddevice.query_devices()`, log available devices |
| Override via config | `config.json` → `audio.input_device` / `audio.output_device` (index or name substring) |

### 3.4 Deliverables Checklist

- [x] `mouth.speak("Hello, let's practice")` plays clear audio through the Pi speaker.
- [x] `ear.listen(5)` records 5 seconds from the USB mic and returns valid WAV data.
- [x] Audio works at the configured sample rate (22050 Hz mono).
- [ ] Model loads in < 5 s on the Pi 4.

---

## Phase 4 — Kivy UI Dashboard (7" Touchscreen)

**Goal:** A Kivy application that runs on the Pi's 7" display (framebuffer/KMS), shows therapy prompts, images, and accepts touch input.

### 4.1 Kivy Configuration

| Task | Details |
|------|---------|
| Framebuffer backend | Set `KIVY_WINDOW=sdl2`, `KIVY_GL_BACKEND=sdl2` for KMS/DRM on Pi OS Lite |
| Resolution | 800 × 480 fullscreen, landscape |
| Touch calibration | Ensure official Pi touchscreen works out of the box |

### 4.2 Dashboard Screens

| Screen | Description |
|--------|-------------|
| **Idle** | Robot name/logo, "Waiting for session…" animation |
| **Prompt** | Large therapy word/image in centre, instructions at top |
| **Feedback** | ✅ or ❌ icon + encouraging message, auto-returns to Prompt |
| **Settings** (stretch) | Volume slider, server URL field, device ID |

### 4.3 Kivy ↔ Agent Communication

| Task | Details |
|------|---------|
| Shared state object | Thread-safe `queue.Queue` or `asyncio.Queue` bridging the polling loop and Kivy's event loop |
| `show_ui` command | Payload: `{"screen": "prompt", "word": "apple", "image_url": "..."}` |
| Touch callbacks | On-screen buttons fire events back to the dispatcher (e.g., user taps "Next") |

Execution entrypoint for UI updates is `src/ui/body_app.py` → `show_ui(payload)`, which is registered with the `Dispatcher`.

### 4.4 Deliverables Checklist

- [ ] Kivy app launches fullscreen on the 7" display.
- [ ] `show_ui` command switches screens and renders content.
- [ ] Touch input is responsive (< 200 ms feedback).
- [ ] App runs alongside the polling loop without blocking.

---

## Phase 5 — GPIO Pan Servo & Procedural OLED Eyes

**Goal:** Bring the robot's physical expressiveness to life with head movement and facial expressions.

### 5.1 Pan Servo Head Control

| Task | Details |
|------|---------|
| Pan servo | GPIO 17 — horizontal rotation (−90° to +90°) |
| `head.move_head(pan)` | In `src/services/head.py`: smooth movement using `gpiozero.AngularServo` with configurable pulse widths |
| `move_head` command payload | `{"pan": 30, "speed": "slow"}` |
| Safety limits | Clamp angles to prevent servo damage, log warnings |
| Smooth motion | Interpolate angle in small steps based on requested speed |
| Idle behavior (stretch) | Slight random pan sway when no command is active |

### 5.2 OLED Eyes (Procedural, No Image Assets)

| Task | Details |
|------|---------|
| Display driver | `luma.oled` over I2C (default config: `0x3C`, 128×128) |
| Eye primitive | Draw two rounded rectangles with Pillow (`ImageDraw.rounded_rectangle`) on black background |
| Expression set | `happy`, `sad`, `thinking`, `surprised`, `neutral`, `listening` from geometry/math parameters |
| Expression math | Control eye width/height, eyelid openness, spacing, and vertical offset to express emotion |
| Gaze control | Apply `gaze_x`/`gaze_y` offsets to both eyes for directional looking |
| `face.show_face(payload)` | In `src/services/face.py`: generate frame procedurally and render to OLED (no PNG loading) |
| `show_face` command payload | `{"expression":"happy","gaze_x":0.2,"gaze_y":-0.1,"duration":1.0}` |
| Transition/animation | Code-driven blink and micro-motion loops (no image transitions) |

### 5.3 Deliverables Checklist

- [ ] `head.move(45)` physically rotates the pan servo to 45°.
- [ ] `show_face` renders cyan rounded-rectangle eyes on OLED without image assets.
- [ ] Expression/gaze payloads visibly change eye geometry and direction.
- [ ] GPIO pin and pulse widths match `config.json` values for pan servo.
- [ ] Pan servo respects safety limits and avoids jitter at rest (detach after move).
- [ ] OLED initialises cleanly on I2C and recovers from bus errors.

---

## Cross-Cutting Concerns (All Phases)

| Concern | Approach |
|---------|----------|
| **Logging** | `loguru` — console + rotating file (`/var/log/execution_agent.log`) |
| **Error handling** | Each driver wraps HW calls in try/except; failures are logged and acked to the server as `status: "error"` |
| **Graceful shutdown** | `SIGINT`/`SIGTERM` handler stops polling, detaches servos, clears OLED, closes audio streams |
| **Hardware mocking** | Every driver falls back to a mock if the import for its HW library fails (enables laptop development) |
| **Testing** | `pytest` with mock drivers; no real hardware needed in CI |
| **Systemd** | `robot.service` starts on boot, restarts on crash, logs to journald |

---

## Timeline Estimate

| Phase | Effort | Depends On |
|-------|--------|------------|
| Phase 1 | 1–2 days | — |
| Phase 2 | 2–3 days | Phase 1 |
| Phase 3 | 2–3 days | Phase 2 |
| Phase 4 | 3–4 days | Phase 2 |
| Phase 5 | 2–3 days | Phase 1 |
| **Total** | **~10–15 days** | Phases 3-5 can partially overlap |

---

*Document generated for the Aphasia Therapy Robot — Execution Agent v1.*
