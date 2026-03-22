"""Load `.env` files in a fixed order for the execution agent and LangGraph.

Later files override earlier ones (same behaviour as the former `run_gui.py` logic).
"""

from __future__ import annotations

from pathlib import Path


def find_repo_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / "agentic" / "graph.py").is_file():
            return p
    return start.parent


def load_agent_env_files(execution_agent_dir: Path | None = None) -> None:
    """Merge env from repo root, backend, agentic/db, execution_agent, then hardware/."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    agent_dir = execution_agent_dir or Path(__file__).resolve().parent
    repo_root = find_repo_root(agent_dir)
    candidates = [
        repo_root / ".env",
        repo_root / "backend" / ".env",
        repo_root / "agentic" / "db" / ".env",
        agent_dir / ".env",
        agent_dir.parent / ".env",
    ]
    for path in candidates:
        if path.is_file():
            load_dotenv(path, override=True)


__all__ = ["load_agent_env_files", "find_repo_root"]
