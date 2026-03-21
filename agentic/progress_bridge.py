"""Thread-safe progress events from the LangGraph run to Kivy (or other UIs).

Call :func:`emit_pipeline_step` from the graph streaming loop; the robot UI
drains via :func:`drain_progress_events` on the main thread.
"""

from __future__ import annotations

import time
from queue import Empty, Queue
from typing import Any, Dict, List, Optional

_PROGRESS_QUEUE: Queue[Dict[str, Any]] = Queue(maxsize=512)


def emit_pipeline_step(
    step_name: str,
    detail: Optional[str] = None,
    *,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Enqueue a short status line for the robot display (best-effort, non-blocking)."""
    item: Dict[str, Any] = {
        "step": step_name,
        "detail": (detail or "").strip(),
        "ts": time.time(),
    }
    if extra:
        item["extra"] = extra
    try:
        _PROGRESS_QUEUE.put_nowait(item)
    except Exception:
        pass


def drain_progress_events(max_items: int = 32) -> List[Dict[str, Any]]:
    """Drain queued progress events (call from Kivy clock on main thread)."""
    out: List[Dict[str, Any]] = []
    for _ in range(max_items):
        try:
            out.append(_PROGRESS_QUEUE.get_nowait())
        except Empty:
            break
    return out


def clear_progress_events() -> None:
    """Drop any queued events (e.g. before starting a new session)."""
    drain_progress_events(max_items=512)


__all__ = ["emit_pipeline_step", "drain_progress_events", "clear_progress_events"]
