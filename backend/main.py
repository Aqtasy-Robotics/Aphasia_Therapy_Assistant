import asyncio
import logging
import os
import sys
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv

# Ensure the repository root is on sys.path so sibling modules like
# `agentic` can be imported when this file is launched from `backend/`.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Absolute imports from the root project level
from agentic.db.supabase_store import persist_session_state
from agentic.state import SpeechTherapyState

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=True)

app = FastAPI(
    title="Waabi Robot Bridge API",
    description="Backend bridge between Waabi hardware and Aqtasy Supabase DB"
)

url = os.getenv("SUPABASE_URL")


key = os.getenv("SUPABASE_SERVICE_KEY")

if not url or not key:
    raise ValueError("Missing SUPABASE credentials. Check your root .env file.")

supabase: Client = create_client(url, key)

bridge_log = logging.getLogger("robot_bridge")

# In-memory FIFO of commands keyed by device_id (robot label or UUID). Laptop MCP/agents POST here; Pi polls GET /commands/{device_id}.
_command_queue_lock = asyncio.Lock()
_command_queues: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))

_ALLOWED_BRIDGE_ACTIONS = frozenset({"speak", "listen", "show_ui", "show_face", "move_head"})


def _profile_id_for_robot_command(device_id: str) -> Optional[str]:
    """Map URL device id to a Supabase ``profiles.id`` for personalized greetings.

    Resolution order:
    1. ``BRIDGE_PATIENT_PROFILE_ID`` env (explicit patient UUID on the server).
    2. If ``device_id`` is a UUID, treat it as ``profiles.id`` (legacy behaviour).
    3. Otherwise return None — caller should use a generic greeting.
    """

    explicit = (os.getenv("BRIDGE_PATIENT_PROFILE_ID") or "").strip()
    if explicit:
        return explicit
    try:
        uuid.UUID(device_id)
    except (ValueError, TypeError):
        return None
    return device_id


def _to_optional_int(value: Any) -> Optional[int]:
    """Convert runtime values to int when possible, else return None."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

class ExecutionCommand(BaseModel):
    command_id: str
    action: str
    payload: Dict[str, Any] = {}
    timestamp: Optional[datetime] = None

class CommandAck(BaseModel):
    command_id: str
    device_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    timestamp: Optional[float] = None


class UiEventIn(BaseModel):
    """Touch or local UI event from the execution agent Kivy dashboard."""

    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[float] = None


class EnqueueCommandIn(BaseModel):
    """Enqueue a robot command for the given device (consumed by GET /commands/{device_id} on the Pi)."""

    action: str = Field(..., description="One of: speak, listen, show_ui, show_face, move_head")
    payload: Dict[str, Any] = Field(default_factory=dict)


def _verify_bridge_command_key(x_bridge_key: Optional[str]) -> None:
    expected = (os.getenv("BRIDGE_COMMAND_API_KEY") or "").strip()
    if not expected:
        return
    if (x_bridge_key or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Bridge-Key")


@app.post("/commands/{device_id}/enqueue", tags=["Robot Bridge"])
async def enqueue_robot_command(
    device_id: str,
    body: EnqueueCommandIn,
    x_bridge_key: Optional[str] = Header(None, alias="X-Bridge-Key"),
):
    """Queue a command for a robot. The Pi polls GET /commands/{device_id} and executes it locally (speaker, mic, UI).

    Set env ``BRIDGE_COMMAND_API_KEY`` and send the same value in header ``X-Bridge-Key`` for production.
    If unset, enqueue is open (development only).
    """
    _verify_bridge_command_key(x_bridge_key)
    action_norm = (body.action or "").strip().lower()
    if action_norm not in _ALLOWED_BRIDGE_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"action must be one of: {sorted(_ALLOWED_BRIDGE_ACTIONS)}",
        )
    cmd = ExecutionCommand(
        command_id=str(uuid.uuid4()),
        action=action_norm,
        payload=dict(body.payload or {}),
        timestamp=datetime.utcnow(),
    )
    async with _command_queue_lock:
        _command_queues[device_id].append(cmd)
    bridge_log.info("Enqueued command id=%s device=%s action=%s", cmd.command_id, device_id, action_norm)
    return {"status": "queued", "command_id": cmd.command_id, "device_id": device_id, "action": action_norm}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "online", "robot": "Waabi", "bridge": "Active"}

@app.get("/commands/{device_id}", response_model=Optional[ExecutionCommand], tags=["Robot Bridge"])
async def get_robot_command(device_id: str):
    async with _command_queue_lock:
        q = _command_queues.get(device_id)
        if q and len(q) > 0:
            cmd = q.popleft()
            bridge_log.debug("Dequeued command id=%s device=%s action=%s", cmd.command_id, device_id, cmd.action)
            return cmd

    # Dev-only: return a show_ui command so the Pi can verify server-driven screens without Supabase.
    if os.getenv("BRIDGE_TEST_SHOW_UI", "").lower() in ("1", "true", "yes"):
        now_iso = datetime.utcnow().isoformat()
        return ExecutionCommand(
            command_id=f"cmd-ui-{now_iso}",
            action="show_ui",
            payload={
                "screen": "practice_word",
                "word": "Apple",
                "message": "Server-driven UI test (BRIDGE_TEST_SHOW_UI)",
            },
            timestamp=datetime.utcnow(),
        )

    profile_id = _profile_id_for_robot_command(device_id)
    now_iso = datetime.utcnow().isoformat()

    if not profile_id:
        # ``device_id`` is a robot label (e.g. robot-pi-001) and no server mapping was set.
        return None

    try:
        profile_response = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", profile_id)
            .single()
            .execute()
        )
        profile_data = profile_response.data
        profile = profile_data if isinstance(profile_data, dict) else {}
        name = str(profile.get("full_name", "there") or "there")
    except Exception:
        return None

    return ExecutionCommand(
        command_id=f"cmd-{now_iso}",
        action="speak",
        payload={"text": f"Hello {name}, let's start our session."},
        timestamp=datetime.utcnow(),
    )

@app.post("/status", tags=["Robot Bridge"])
async def post_robot_status(ack: CommandAck):
    result: Dict[str, Any] = ack.result or {}
    patient_id = result.get("patient_id")
    if not patient_id:
        return {
            "report_id": None,
            "status": "skipped",
            "message": (
                "Missing patient_id in ack.result; bridge did not write session_reports. "
                "Therapy runs started from the Kivy GUI save via LangGraph when the graph "
                "finishes (persist_session_state), not via this endpoint."
            ),
        }
    
    state: SpeechTherapyState = {
        "audio_path": None,
        "transcript": result.get("transcript"),
        "confidence_score": result.get("confidence_score"),
        "retry_count": int(result.get("retry_count") or 0),
        "perception_failure_reason": result.get("perception_failure_reason"),
        "transcript_attempts": result.get("transcript_attempts") or [],

        "target_word": result.get("target_word"),
        "target_words": result.get("target_words") or [],
        "current_target_index": int(result.get("current_target_index") or 0),
        "has_more_target_words": bool(result.get("has_more_target_words") or False),
        "patient_name": str(result.get("patient_name") or ""),
        "therapy_goals": result.get("therapy_goals") or [],
        "phonemes_to_focus_on": result.get("phonemes_to_focus_on") or [],
        "difficulty_level": result.get("difficulty_level") or "medium",

        "target_phonemes": result.get("target_phonemes"),
        "attempt_phonemes": result.get("attempt_phonemes"),
        "error_report": result.get("error_report"),
        "semantic_label": result.get("semantic_label"),

        "feedback": result.get("feedback"),
        "practice_exercise": result.get("practice_exercise"),
        "feedback_attempts": int(result.get("feedback_attempts") or 0),
        "feedback_scores": result.get("feedback_scores"),

        "patient_id": str(patient_id),
        "assignment_id": result.get("assignment_id"),
        "word_source": result.get("word_source"),
        "session_start": result.get("session_start") or time.time(),
        "session_duration_secs": _to_optional_int(result.get("session_duration_secs")),

        "report_id": None,
        "agent_run_id": result.get("agent_run_id"),
        "audio_output_path": result.get("audio_output_path"),
        "session_complete": bool(result.get("session_complete") or False),
        "session_outcome": result.get("session_outcome"),
        "fatigue_level": _to_optional_int(result.get("fatigue_level")),

        "current_error": result.get("current_error"),

        "session_history": result.get("session_history") or [],
        "memory_context": result.get("memory_context") or [],
        "patient_trend": result.get("patient_trend"),
        "sessions_done": int(result.get("sessions_done") or 0),
    }
    
    report_id = persist_session_state(state)
    return {"report_id": report_id}


@app.post("/ui-events/{device_id}", tags=["Robot Bridge"])
async def post_ui_event(device_id: str, body: UiEventIn):
    """Receive touch/session events from the Kivy UI (execution agent)."""
    bridge_log.info(
        "UI event device=%s type=%s payload=%s ts=%s",
        device_id,
        body.type,
        body.payload,
        body.timestamp,
    )
    try:
        supabase.table("robot_ui_events").insert(
            {
                "device_id": device_id,
                "event_type": body.type,
                "payload": body.payload,
                "client_ts": body.timestamp,
            }
        ).execute()
    except Exception as exc:
        bridge_log.warning("robot_ui_events insert skipped: %s", exc)
    return {"status": "ok", "device_id": device_id}


@app.post("/audio/{device_id}", tags=["Robot Bridge"])
async def upload_robot_audio(device_id: str, file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_path = f"{device_id}/{int(time.time())}_{file.filename}"
        
        supabase.storage.from_("robot-audio").upload(file_path, content)
        
        return {"status": "ok", "path": file_path}
    except Exception as e:
        print(f"Audio upload failed: {e}")
        return {"status": "error", "message": str(e)}