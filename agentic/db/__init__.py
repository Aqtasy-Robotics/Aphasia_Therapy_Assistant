"""DB helpers for agentic persistence (lazy mem0 imports to keep `import agentic.graph` light)."""

from __future__ import annotations

from typing import Any

from .supabase_store import (
    fetch_personalization_config,
    persist_session_state,
)

__all__ = [
    "persist_session_state",
    "fetch_personalization_config",
    "add_session_memory",
    "search_session_memories",
]


def __getattr__(name: str) -> Any:
    if name == "add_session_memory":
        from .mem0_store import add_session_memory

        return add_session_memory
    if name == "search_session_memories":
        from .mem0_store import search_session_memories

        return search_session_memories
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
