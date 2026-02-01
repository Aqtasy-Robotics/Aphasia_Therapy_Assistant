import json
import os
from datetime import datetime
from typing import Any, Dict, List

from config import get_session_log_path


def _load_all_records(path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception:
        return []


def _save_all_records(path: str, records: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def log_attempt(
    session_id: str,
    target_word: str,
    user_attempt_text: str,
    error_type: str,
    match_score: float,
    raw_error_report: Dict[str, Any] | None = None,
) -> None:
    path = get_session_log_path()
    records = _load_all_records(path)
    record: Dict[str, Any] = {
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "target_word": target_word,
        "user_attempt_text": user_attempt_text,
        "error_type": error_type,
        "match_score": match_score,
    }
    if raw_error_report is not None:
        record["raw_error_report"] = raw_error_report
    records.append(record)
    _save_all_records(path, records)


def get_session_stats(session_id: str) -> Dict[str, Any]:
    path = get_session_log_path()
    records = [r for r in _load_all_records(path) if r.get("session_id") == session_id]
    total = len(records)
    successes = sum(1 for r in records if r.get("error_type") == "Success")
    success_percentage = (successes / total) * 100.0 if total > 0 else 0.0
    return {
        "session_id": session_id,
        "total_attempts": total,
        "successes": successes,
        "success_percentage": success_percentage,
    }

