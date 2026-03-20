import os
import sys
import time
from datetime import datetime
from typing import Optional, Dict, Any

# --- CRITICAL FIX: Trick Python into seeing the 'agentic' folder as a root ---
# This allows the untouched agentic files to run "from state import..." successfully
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
agentic_dir = os.path.join(root_dir, "agentic")

if root_dir not in sys.path:
    sys.path.append(root_dir)
if agentic_dir not in sys.path:
    sys.path.append(agentic_dir)
# ---------------------------------------------------------------------------

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Now these imports will work perfectly!
from agentic.db.supabase_store import persist_session_state
from agentic.state import SpeechTherapyState

load_dotenv()

app = FastAPI(
    title="Waabi Robot Bridge API",
    description="Backend bridge between Waabi hardware and Aqtasy Supabase DB"
)

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not url or not key:
    raise ValueError("Missing SUPABASE credentials. Check your root .env file.")

supabase: Client = create_client(url, key)

class ExecutionCommand(BaseModel):
    command_id: str
    action: str
    payload: Dict[str, Any] = {}
    timestamp: Optional[float] = None

class CommandAck(BaseModel):
    command_id: str
    device_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    timestamp: Optional[float] = None

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "online", "robot": "Waabi", "bridge": "Active"}

@app.get("/commands/{device_id}", response_model=Optional[ExecutionCommand], tags=["Robot Bridge"])
async def get_robot_command(device_id: str):
    try:
        profile_response = supabase.table("profiles").select("full_name").eq("id", device_id).single().execute()
        profile = profile_response.data or {}
        name = profile.get("full_name", "there")
        now_iso = datetime.utcnow().isoformat()
        
        return ExecutionCommand(
            command_id=f"cmd-{now_iso}",
            action="speak",
            payload={"text": f"Hello {name}, let's start our session."},
            timestamp=datetime.utcnow().timestamp(),
        )
    except Exception:
        return None 

@app.post("/status", tags=["Robot Bridge"])
async def post_robot_status(ack: CommandAck):
    result: Dict[str, Any] = ack.result or {}
    
    state: SpeechTherapyState = {
        "patient_id": result.get("patient_id") or ack.device_id,
        "target_word": result.get("target_word"),
        
        # Target sentence captured from the robot!
        "target_sentence": result.get("target_sentence"), 
        
        "transcript": result.get("transcript"),
        "error_report": result.get("error_report"),
        "semantic_label": result.get("semantic_label"),
        "feedback": result.get("feedback"),
        "practice_exercise": result.get("practice_exercise"),
        "session_start": result.get("session_start") or time.time(),
        "session_duration_secs": result.get("session_duration_secs"),
        "audio_path": None,
        "confidence_score": None,
        "retry_count": 0,
        "patient_name": result.get("patient_name", ""),
        "target_phonemes": result.get("target_phonemes"),
        "attempted_phonemes": result.get("attempted_phonemes"),
        "feedback_attempts": 0,
        "word_source": result.get("word_source"),
        "report_id": None,
        "audio_output_path": None,
    }
    
    report_id = persist_session_state(state)
    return {"report_id": report_id}

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