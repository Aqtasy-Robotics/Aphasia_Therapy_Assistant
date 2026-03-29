"""
laptop_server.py — FastAPI server running on the laptop.

Receives WAV audio from the Raspberry Pi, runs one LangGraph attempt
(perception → ... → execution), and returns the TTS audio response.

Run with:
    ROBOT_REMOTE_MODE=1 uvicorn laptop_server:app --host 0.0.0.0 --port 8000

The Pi connects to:  http://<your-laptop-ip>:8000
"""

from __future__ import annotations

import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict

# Set remote mode BEFORE importing perception_node (it reads this at module load)
os.environ["ROBOT_REMOTE_MODE"] = "1"

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

# ── Path setup ───────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from agentic.graph import build_graph, _build_initial_state, run_single_attempt
from agentic.db.supabase_store import (
    fetch_patient_id_by_name,
    fetch_target_words_and_session_id,
    fetch_personalization_config,
    insert_agent_pipeline_step,
    link_pipeline_steps_to_report,
    persist_session_state,
)
from agentic.progress_bridge import clear_progress_events, emit_pipeline_step

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Speech Therapy Robot — Laptop Server", version="1.0.0")

# In-memory session store: session_id → session context dict
# Each context holds the accumulated LangGraph state between attempts.
_sessions: Dict[str, Dict[str, Any]] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _retry_hint(reason: str, target_word: str) -> str:
    """Human-readable retry message for the GUI mic hint."""
    if reason == "silence":
        return "I could not hear you. Please speak louder and try again."
    if reason == "noise":
        return "Too much background noise. Please move to a quieter spot."
    if reason == "non_english":
        word = target_word or "the word"
        return f"Please say '{word}' in English and try again."
    if reason == "error":
        return "Recording issue. Please try again."
    return "Please try again."


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> Dict[str, Any]:
    """Pi can ping this to confirm the server is reachable before starting a session."""
    return {"status": "ok", "active_sessions": len(_sessions)}


@app.post("/session/start")
async def start_session(patient_name: str = Form(...)) -> Dict[str, Any]:
    """
    Resolve the patient from Supabase, load their target words, and create a
    session context.  Returns the session_id and first target word so the Pi
    can update the GUI before the first recording.
    """
    patient_name = (patient_name or "").strip()
    if not patient_name:
        raise HTTPException(status_code=400, detail="patient_name is required")

    patient_id = fetch_patient_id_by_name(patient_name)
    if not patient_id:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{patient_name}' not found. Check profiles.full_name.",
        )

    personalization = fetch_personalization_config(
        patient_id=patient_id, assignment_id=None
    )
    session_id_db, target_words = fetch_target_words_and_session_id(patient_id)
    if not target_words:
        raise HTTPException(
            status_code=404,
            detail=(
                "No target words found for this patient. "
                "Add sessions.target_words/target_sentence for this patient, "
                "or set DEFAULT_TARGET_WORDS in environment (comma-separated)."
            ),
        )

    run_id = str(uuid.uuid4())
    initial_state = _build_initial_state(
        patient_name=patient_name,
        patient_id=patient_id,
        session_id=session_id_db,
        assignment_id=None,
        personalization=personalization,
        target_words=target_words,
    )
    initial_state["agent_run_id"] = run_id

    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "state": initial_state,
        "run_id": run_id,
        "patient_id": patient_id,
        "complete": False,
    }

    clear_progress_events()
    emit_pipeline_step(
        "session_start",
        f"Patient='{patient_name}', {len(target_words)} target word(s)",
    )

    return {
        "session_id": session_id,
        "target_word": initial_state["target_word"],
        "target_words": target_words,
        "current_index": 0,
        "patient_name": patient_name,
    }


@app.post("/session/{session_id}/attempt")
async def session_attempt(
    session_id: str,
    audio: UploadFile = File(..., description="WAV audio recorded on the Pi"),
) -> Any:
    """
    Receive a WAV file from the Pi, inject it into the LangGraph state as
    `audio_path`, run one pass through the graph (perception → execution),
    and return either:

    - WAV audio (TTS feedback) with headers:
        X-Session-Status : next_word | complete
        X-Feedback-Text  : first 200 chars of feedback
        X-Target-Word    : next word (empty when complete)
        X-Current-Index  : int index in target_words

    - JSON with status=retry when the audio quality check fails.
    """
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    sess = _sessions[session_id]
    if sess["complete"]:
        raise HTTPException(status_code=400, detail="Session is already complete")

    # ── Save uploaded audio to a temp file ───────────────────────
    audio_bytes = await audio.read()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.write(audio_bytes)
    tmp.close()
    tmp_audio_path = tmp.name

    # ── Inject audio path and run one graph attempt ───────────────
    state = dict(sess["state"])
    state["audio_path"] = tmp_audio_path

    try:
        result_state, needs_retry = run_single_attempt(state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LangGraph error: {exc}") from exc
    finally:
        # Always clean up the uploaded audio file
        try:
            os.unlink(tmp_audio_path)
        except OSError:
            pass

    # ── Persist pipeline step to Supabase ────────────────────────
    patient_id = sess["patient_id"]
    run_id = sess["run_id"]
    try:
        insert_agent_pipeline_step(
            patient_id=patient_id,
            run_id=run_id,
            step_name="attempt",
            detail={
                "transcript": result_state.get("transcript"),
                "confidence_score": result_state.get("confidence_score"),
                "retry_count": result_state.get("retry_count"),
                "needs_retry": needs_retry,
            },
        )
    except Exception:
        pass  # don't let DB errors break the session

    # ── Update stored state ───────────────────────────────────────
    sess["state"] = result_state

    # ── Handle retry ──────────────────────────────────────────────
    if needs_retry:
        failure_reason = result_state.get("perception_failure_reason") or "retry"
        target_word = result_state.get("target_word") or ""
        return JSONResponse(
            content={
                "status": "retry",
                "failure_reason": failure_reason,
                "hint": _retry_hint(failure_reason, target_word),
                "target_word": target_word,
                "retry_count": result_state.get("retry_count", 0),
            }
        )

    # ── Success path: return TTS audio ───────────────────────────
    session_complete = bool(result_state.get("session_complete", False))
    tts_path = result_state.get("audio_output_path")
    status = "complete" if session_complete else "next_word"

    if session_complete:
        sess["complete"] = True
        # Persist final session report
        try:
            report_id = persist_session_state(result_state)
            if report_id:
                result_state["report_id"] = report_id
                sess["state"] = result_state
                link_pipeline_steps_to_report(
                    run_id=run_id, report_id=report_id, patient_id=patient_id
                )
        except Exception:
            pass
        emit_pipeline_step("session_end", f"complete — report_id={result_state.get('report_id', 'none')}")

    feedback_text = str((result_state.get("feedback") or {}).get("feedback_text") or "")
    next_word = str(result_state.get("target_word") or "")
    current_index = int(result_state.get("current_target_index") or 0)

    if tts_path and os.path.exists(tts_path):
        return FileResponse(
            path=tts_path,
            media_type="audio/wav",
            filename="feedback.wav",
            headers={
                "X-Session-Status": status,
                "X-Feedback-Text": feedback_text[:200],
                "X-Target-Word": next_word,
                "X-Current-Index": str(current_index),
            },
        )

    # Text-only fallback (no TTS engine available)
    return JSONResponse(
        content={
            "status": status,
            "feedback_text": feedback_text,
            "target_word": next_word,
            "current_index": current_index,
        }
    )


@app.delete("/session/{session_id}")
async def end_session(session_id: str) -> Dict[str, Any]:
    """Explicitly clean up a session (called by Pi on app exit or error)."""
    if session_id in _sessions:
        del _sessions[session_id]
    return {"status": "deleted", "session_id": session_id}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Starting Speech Therapy Robot — Laptop Server")
    print("Pi should POST to: http://<your-laptop-ip>:8000")
    uvicorn.run("laptop_server:app", host="0.0.0.0", port=8000, reload=False)