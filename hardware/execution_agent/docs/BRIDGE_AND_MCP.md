# Laptop agents (MCP) + Raspberry Pi UI / mic / speaker

This flow uses the **FastAPI bridge** (`backend/main.py`) as a command queue:

1. **Laptop:** Claude / MCP calls `bridge_*_on_robot` tools → HTTP `POST /commands/{device_id}/enqueue`
2. **Bridge:** Stores commands in memory (FIFO per `device_id`)
3. **Pi:** `execution_agent/main.py` polls `GET /commands/{device_id}` → `Dispatcher` runs `speak` / `listen` / `show_ui` **on the Pi** (speaker, mic, Kivy)

## Prerequisites

- Same repo on laptop and Pi (or copy `hardware/execution_agent` + `backend` as needed)
- Pi and laptop on the same LAN (or VPN)
- Root `.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (for the bridge server)
- Optional: `BRIDGE_COMMAND_API_KEY` (same value in bridge env and laptop `execution_agent/.env` for MCP)

## 1) Run the bridge on the **laptop** (or any server the Pi can reach)

From repo root:

```powershell
cd "C:\Users\USER\Desktop\Aqtasy Robotics\Aphasia_Therapy_Assistant"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install -r requirements.txt
```

If `backend/requirements.txt` is minimal, ensure you have: `fastapi`, `uvicorn`, `supabase`, `python-dotenv`, `pydantic` (install errors will tell you).

Start API (replace `0.0.0.0` so the Pi can connect; use your laptop LAN IP in Pi `.env`):

```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Optional security (recommended):

```dotenv
# repo root .env or backend/.env
BRIDGE_COMMAND_API_KEY=your-long-random-secret
```

## 2) Configure the **Raspberry Pi** `execution_agent`

Edit `hardware/execution_agent/.env`:

- `SERVER_URL=http://<LAPTOP_LAN_IP>:8000` (must match where uvicorn runs)
- `DEVICE_ID=robot-pi-001` (or any stable label; must match what you pass from MCP)
- `PIPER_MODEL_PATH=...` (path to Piper ONNX on the Pi)
- Start Kivy with the agent:

```dotenv
EXECUTION_AGENT_START_UI=1
```

Edit `hardware/execution_agent/config.json` → ensure `polling.enabled` is `true` (default in your template).

### Run on the Pi (must run **on the Raspberry Pi**)

```bash
cd ~/Aphasia_Therapy_Assistant/hardware/execution_agent
source .venv/bin/activate   # or your venv
export EXECUTION_AGENT_START_UI=1
python main.py
```

The Pi will poll the bridge and execute commands on **local** speaker, mic, and Kivy.

## 3) Configure **MCP on the laptop** (Claude Desktop / Cursor)

Same machine that runs MCP needs `hardware/execution_agent/.env`:

- `SERVER_URL=http://<LAPTOP_LAN_IP>:8000` (same bridge URL; can be `http://127.0.0.1:8000` if MCP and uvicorn are on the same PC)
- `DEVICE_ID=robot-pi-001` (same as Pi)
- If you set `BRIDGE_COMMAND_API_KEY` on the server, add the same to this `.env`:

```dotenv
BRIDGE_COMMAND_API_KEY=your-long-random-secret
```

Run MCP:

```powershell
cd "C:\Users\USER\Desktop\Aqtasy Robotics\Aphasia_Therapy_Assistant\hardware\execution_agent"
python -m mcp_server
```

Or register `python -m mcp_server` in Claude Desktop with `cwd` set to this folder.

## 4) MCP tools to use (remote Pi)

| Tool | Purpose |
|------|--------|
| `bridge_health_remote` | Check bridge `GET /health` |
| `bridge_speak_on_robot` | TTS on Pi speaker |
| `bridge_listen_on_robot` | Record on Pi mic (upload depends on `ear` + backend) |
| `bridge_show_ui_on_robot` | Kivy screen on Pi |
| `bridge_enqueue_command` | Generic `speak` / `listen` / `show_ui` / … |

Local-only tools (`ui_show`, `audio_speak`, …) still affect **only the machine running MCP**, not the Pi.

## 5) LangGraph / “agent on laptop”

This bridge queue drives **hardware** on the Pi. **LangGraph** (`agentic/graph.py`) is not automatically started by MCP. To run therapy logic on the laptop, call your Python entrypoint separately (e.g. `run_session_for_patient`) or add a future MCP tool that wraps it; use `bridge_speak_on_robot` / `bridge_listen_on_robot` from your agent code when you want Pi I/O.

## Troubleshooting

- **Pi never gets commands:** `SERVER_URL` on Pi must reach the laptop; firewall must allow port 8000; `DEVICE_ID` must match enqueue path.
- **401 on enqueue:** Set `BRIDGE_COMMAND_API_KEY` on server and same key in laptop `.env` for MCP.
- **No UI on Pi:** Set `EXECUTION_AGENT_START_UI=1` and ensure Kivy/display works on the Pi.
