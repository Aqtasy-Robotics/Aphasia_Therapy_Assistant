# Waabi — Aphasia Therapy Assistant

> **An AI-powered robotic companion that supports aphasia recovery through structured, conversational speech therapy sessions.**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start: Kivy GUI (Robot)](#quick-start-kivy-gui-robot)
  - [Quick Start: FastAPI Bridge](#quick-start-fastapi-bridge)
  - [Quick Start: Frontend Web App](#quick-start-frontend-web-app)
- [Environment Variables](#environment-variables)
- [Data Flow](#data-flow)
- [Supabase Setup](#supabase-setup)


---

## Overview

Aphasia is a language disorder most commonly caused by stroke or brain injury, affecting a person's ability to speak, understand, read, and write. **Waabi** is a robotic therapy assistant designed to deliver consistent, engaging, and data-driven speech therapy exercises — bridging the gap between clinical appointments and at-home rehabilitation.

Waabi combines a LangGraph-based agentic therapy pipeline, a FastAPI communication bridge, a React web portal for therapists and patients, and a touchscreen-capable Kivy GUI that runs directly on the robot's hardware (e.g. a Raspberry Pi).

---

## Features

- **Agentic therapy sessions** — A LangGraph pipeline guides patients through structured speech exercises (perception → analysis → feedback → execution).
- **Real-time voice interaction** — Microphone capture, text-to-speech via Piper, and optional ElevenLabs Conversational AI integration.
- **Session reporting** — Completed sessions are automatically persisted to Supabase for therapist review.
- **Dual interfaces** — A Kivy touchscreen GUI for bedside/robot use and a React web app for therapist and patient portals.
- **Hardware–cloud bridge** — A FastAPI server mediates commands, status updates, UI events, and audio uploads between the robot and the cloud.
- **Progress tracking** — Recharts-powered dashboards in the web app let therapists monitor patient progress over time.
- **Role-based access** — Supabase Auth with protected routes for therapist and patient roles.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Web App (React)                    │
│          Therapist Portal │ Patient Portal              │
└──────────────────┬──────────────────────────────────────┘
                   │ Supabase Auth (anon key)
                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                  │
│   profiles │ sessions │ session_reports │ robot-audio   │
└───────────────┬─────────────────────────────────────────┘
                │ service role key
                ▼
┌─────────────────────────────────────────────────────────┐
│             FastAPI Bridge  (backend/main.py)            │
│   GET /commands/{device_id}  │  POST /status            │
│   POST /audio/{device_id}    │  POST /ui-events         │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP polling
                   ▼
┌─────────────────────────────────────────────────────────┐
│         Hardware Execution Agent (Raspberry Pi)          │
│   hardware/execution_agent/main.py  │  run_gui.py       │
│   Kivy Touchscreen GUI + Drivers (speak, listen, UI)    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│          LangGraph Therapy Agent  (agentic/)             │
│   Perception → Analysis → Feedback → Execution          │
└─────────────────────────────────────────────────────────┘
```

---

## Repository Layout

```
Aphasia_Therapy_Assistant/
├── agentic/                    # LangGraph speech-therapy pipeline + Supabase helpers
│   └── graph.py                # Main session entrypoint (run_session_for_patient)
├── backend/
│   ├── main.py                 # FastAPI bridge: commands, status, audio, UI events
│   ├── requirements.txt
│   └── .env.example
├── frontend/                   # React + Vite web app (therapist / patient portals)
├── hardware/
│   └── execution_agent/        # Robot / Raspberry Pi software
│       ├── main.py             # Polling loop + hardware drivers
│       ├── run_gui.py          # Kivy launcher (therapy GUI + LangGraph)
│       ├── env_bootstrap.py    # .env merge order utility
│       ├── config.json
│       └── .env.example
├── ML/                         # Speech analysis experiments and research
├── integrations/
│   └── elevenlabs_convai/      # ElevenLabs Conversational AI integration
├── pipecat/                    # Optional real-time voice assistant stack
├── supabase/
│   └── migrations/             # SQL migrations (robot_ui_events, pipeline tables, etc.)
├── scripts/                    # Helper shell scripts
├── tests/                      # Test suite (pytest)
├── laptop_server.py            # Convenience server launcher
├── requirements.txt            # Root Python dependencies
├── requirements-dev.txt        # Dev/test dependencies
└── netlify.toml                # Frontend deployment config
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), TypeScript, Tailwind CSS, Recharts, React Router v6 |
| **Backend / Bridge** | Python, FastAPI, Uvicorn |
| **Therapy Agent** | LangGraph, Groq (LLM inference) |
| **Database & Auth** | Supabase (PostgreSQL), Supabase Storage |
| **Robot GUI** | Python, Kivy, kvlang |
| **TTS** | Piper (local), ElevenLabs (cloud) |
| **CI/CD** | GitHub Actions, Netlify |
| **Testing** | Pytest |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ (for the frontend)
- A [Supabase](https://supabase.com/) project with the required tables and storage bucket (see [Supabase Setup](#supabase-setup))
- A [Groq](https://console.groq.com/) API key
- PortAudio installed on the robot device (`sudo apt-get install portaudio19-dev`)

---

### Quick Start: Kivy GUI (Robot)

Run from **`hardware/execution_agent/`**:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # Fill in SERVER_URL, DEVICE_ID, Supabase & Groq keys
```

> **No microphone / headless testing?** Set `RUN_GUI_SKIP_PORTAUDIO_CHECK=1` in your `.env`.

```bash
python run_gui.py
```

The GUI will prompt for the patient's full name (must match a `profiles.full_name` row with `role = 'patient'` in Supabase). The LangGraph pipeline then runs the session and writes a report to `session_reports` on completion.

`.env` files are merged in this order (later files override earlier ones):

```
repo root .env → backend/.env → agentic/db/.env → execution_agent/.env → hardware/.env
```

---

### Quick Start: FastAPI Bridge

```bash
cd /path/to/Aphasia_Therapy_Assistant
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (repo root or backend/.env)
uvicorn backend.main:app --reload --app-dir .
```

The `--app-dir .` flag ensures `agentic` package imports resolve correctly from the repo root.

---

### Quick Start: Frontend Web App

```bash
cd frontend
npm install
cp .env.example .env.local         # Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

### Repo root `.env` *(recommended single source)*

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |
| `GROQ_API_KEY` | Groq API key for LLM inference |

### `hardware/execution_agent/.env`

| Variable | Description |
|---|---|
| `SERVER_URL` | URL of the FastAPI bridge |
| `DEVICE_ID` | Stable identifier for the robot (e.g. `robot-pi-001` or a patient UUID) |
| Piper paths | Path to local TTS model files |

### `backend/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `BRIDGE_PATIENT_PROFILE_ID` | *(Optional)* Patient `profiles.id` UUID. Use when `DEVICE_ID` is a label rather than a UUID; the bridge loads the patient's name for session greetings. |

> **Robot ID vs Patient ID:** `DEVICE_ID` identifies the robot in API paths. For the bridge greeting, either set `BRIDGE_PATIENT_PROFILE_ID` on the server, or set `DEVICE_ID` to the patient's `profiles.id` UUID directly (legacy behaviour).

---

## Data Flow

### A — Kivy GUI Therapy Session *(typical demo / standalone)*

1. Launch `run_gui.py` from `hardware/execution_agent/`.
2. Patient enters their name; the GUI looks up the matching `profiles` row in Supabase.
3. `agentic/graph.py` runs `run_session_for_patient` through the full LangGraph pipeline.
4. On completion, `persist_session_state` writes results to `session_reports`.
5. The FastAPI bridge is **not required** for session persistence in this path.

### B — Execution Agent + FastAPI Polling

1. Start the bridge: `uvicorn backend.main:app --reload --app-dir .`
2. Start the polling agent: `hardware/execution_agent/main.py` (with `polling` enabled in `config.json`).
3. The robot calls `GET /commands/{DEVICE_ID}`, executes actions, then posts to `POST /status`.
4. `POST /status` writes to `session_reports` only when `ack.result` includes `patient_id` and the full expected state fields. For complete session persistence, prefer the Kivy/LangGraph path.

### C — Web App

- `frontend/` authenticates via Supabase Auth using the **anon key** (set in Vite env).
- Therapists can view patient session reports, assign target words, and monitor progress.
- Patients can access their session history and exercises.

---

## Supabase Setup

1. **Apply migrations** from `supabase/migrations/` to your Supabase project (includes `robot_ui_events`, `agent_pipeline_steps`, and others).

2. **Ensure these tables exist:**
   - `profiles` — user accounts with a `role` column (`'therapist'` or `'patient'`) and `full_name`
   - `sessions` — therapy session definitions including `target_words`
   - `session_reports` — completed session results written by the agent

3. **Create a storage bucket** named `robot-audio` if you use robot audio upload functionality.

4. **Configure RLS (Row Level Security)** policies as appropriate for your deployment — therapists should read all patient records; patients should read only their own.

---
