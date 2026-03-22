# Meet Waabi: Your Aphasia Recovery Robot by Aqtasy Robotics

## Tech stack

### Frontend (client)

- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Routing:** React Router v6 (protected routes, roles)

### Backend (FastAPI bridge)

- **API:** `backend/main.py` — HTTP bridge for the execution agent (commands, status, UI events, audio upload to Supabase Storage)
- **Database:** Supabase (PostgreSQL)

### Therapy agent (LangGraph)

- **Code:** `agentic/` — perception → analysis → feedback → execution
- **Persistence:** writes to `session_reports` in Supabase when a session completes

### Hardware execution agent

- **Code:** `hardware/execution_agent/` — polls the bridge, runs drivers (speak, listen, UI, etc.)
- **Kivy GUI:** `run_gui.py` — touchscreen flow; starts LangGraph with patient name from the UI

---

## Repository layout (actual paths)

```text
Aphasia_Therapy_Assistant/
├── agentic/                 # LangGraph speech-therapy pipeline + Supabase helpers
├── backend/
│   ├── main.py              # FastAPI Waabi bridge (not backend/app/routers)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React web app (therapist / patient portals)
├── hardware/
│   └── execution_agent/     # Robot / Pi software + Kivy UI
│       ├── main.py          # Polling + drivers (optional UI)
│       ├── run_gui.py       # Kivy-only launcher (therapy GUI + LangGraph)
│       ├── env_bootstrap.py # Shared .env merge order
│       ├── config.json
│       └── .env.example
├── ML/                      # Speech / analysis experiments
├── supabase/migrations/     # SQL for robot + pipeline tables
└── scripts/                 # Helper shell scripts
```

---

## Environment variables

### Repo root `.env` (recommended single place)

Often used for `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `GROQ_API_KEY`.

### `hardware/execution_agent/.env`

Loaded **after** root and `backend/.env` (see `env_bootstrap.py`), so local overrides win. Use for `SERVER_URL`, `DEVICE_ID`, Piper paths, and optionally the same Supabase/Groq keys for the GUI.

### `backend/.env`

Convenient for running the FastAPI app from the `backend/` folder: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and optionally:

- **`BRIDGE_PATIENT_PROFILE_ID`** — patient’s `profiles.id` (UUID). Use when the robot’s `DEVICE_ID` is a **label** (e.g. `robot-pi-001`). The bridge then loads that profile’s `full_name` for the greeting in `GET /commands/{device_id}`.

### Robot id vs patient id

- **`DEVICE_ID`** (on the device): identifies the robot in URLs (`/commands/...`, `/audio/...`, `/ui-events/...`). It may be any stable string.
- **Patient identity for the bridge greeting:** either set **`BRIDGE_PATIENT_PROFILE_ID`** on the server, **or** set `DEVICE_ID` to the patient’s **UUID** from `profiles.id` (legacy behaviour).

---

## How data flows

### A. Kivy GUI therapy session (typical demo)

1. Run `hardware/execution_agent/run_gui.py` (from that directory, or via your venv).
2. User enters **patient full name** (must match `profiles.full_name` with `role = 'patient'`).
3. LangGraph runs (`agentic/graph.py` → `run_session_for_patient`).
4. On success, **`persist_session_state`** writes to **`session_reports`** in Supabase.
5. This path does **not** require the FastAPI bridge for saving the report.

### B. Execution agent + FastAPI polling

1. Start the bridge: `uvicorn backend.main:app --reload` (from repo root with `PYTHONPATH=.` or install the project so `agentic` imports work).
2. Run `hardware/execution_agent/main.py` with polling enabled in `config.json`.
3. Robot calls `GET /commands/{DEVICE_ID}`, executes actions, posts `POST /status`, etc.
4. **`POST /status`** only writes **`session_reports`** if `ack.result` contains **`patient_id`** and the full state fields the bridge expects. Default drivers usually do **not** send that; use the Kivy/LangGraph path for full session persistence.

### C. Web app

- **`frontend/`** uses Supabase Auth (anon key in Vite env) for therapist/patient portals — separate from the service role used by the bridge/agent.

---

## Quick start: Kivy GUI

From **`hardware/execution_agent/`**:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit SERVER_URL, DEVICE_ID, paths, and/or Supabase + Groq
```

Ensure **PortAudio** is available for the microphone, or use `RUN_GUI_SKIP_PORTAUDIO_CHECK=1` for UI-only testing (see `run_gui.py`).

From the same directory:

```bash
python run_gui.py
```

`run_gui.py` merges `.env` files in this order (later overrides): repo root → `backend/.env` → `agentic/db/.env` → `execution_agent/.env` → `hardware/.env`.

---

## Quick start: FastAPI bridge

```bash
cd /path/to/Aphasia_Therapy_Assistant
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
# Set SUPABASE_URL and SUPABASE_SERVICE_KEY in repo root .env and/or backend/.env
uvicorn backend.main:app --reload --app-dir .
```

(`--app-dir .` keeps imports like `agentic` working when the cwd is the repo root.)

---

## Supabase setup

- Apply migrations under `supabase/migrations/` (e.g. `robot_ui_events`, `agent_pipeline_steps`).
- Ensure tables used by the app exist: `profiles`, `sessions` (with `target_words`), `session_reports`.
- Create a storage bucket **`robot-audio`** if you use robot audio upload.

---

## Pipecat / ML

- **`pipecat/`** — optional real-time voice assistant stack; not wired into the FastAPI bridge in this repo.
- **`ML/`** — research and tooling; not the same entrypoint as `agentic/graph.py`.
