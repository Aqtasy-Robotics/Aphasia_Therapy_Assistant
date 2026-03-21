import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File
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


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "online", "robot": "Waabi", "bridge": "Active"}

@app.get("/commands/{device_id}", response_model=Optional[ExecutionCommand], tags=["Robot Bridge"])
async def get_robot_command(device_id: str):
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

    try:
        profile_response = supabase.table("profiles").select("full_name").eq("id", device_id).single().execute()
        profile_data = profile_response.data
        profile = profile_data if isinstance(profile_data, dict) else {}
        name = str(profile.get("full_name", "there") or "there")
        now_iso = datetime.utcnow().isoformat()
        
        return ExecutionCommand(
            command_id=f"cmd-{now_iso}",
            action="speak",
            payload={"text": f"Hello {name}, let's start our session."},
            timestamp=datetime.utcnow(),
        )
    except Exception:
        return None 

@app.post("/status", tags=["Robot Bridge"])
async def post_robot_status(ack: CommandAck):
    result: Dict[str, Any] = ack.result or {}
    patient_id = result.get("patient_id")
    if not patient_id:
        return {
            "report_id": None,
            "status": "skipped",
            "message": "Missing patient_id in ack.result; session report was not persisted.",
        }
    
    state: SpeechTherapyState = {
        "audio_path": None,
        "transcript": result.get("transcript"),
        "confidence_score": None,
        "retry_count": 0,
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

        "patient_id": str(patient_id),
        "assignment_id": result.get("assignment_id"),
        "word_source": result.get("word_source"),
        "session_start": result.get("session_start") or time.time(),
        "session_duration_secs": _to_optional_int(result.get("session_duration_secs")),

        "report_id": None,
        "audio_output_path": None,
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