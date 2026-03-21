#!/usr/bin/env python
"""Kivy-only launcher (no FastAPI polling, no POST /ui-events).

Use this to develop or demo the 7\" touch UI by itself. For the full execution
agent with backend polling, UI event forwarding, and hardware drivers, run
``main.py`` (optionally via ``scripts/run_agent_desktop.sh`` with
``EXECUTION_AGENT_START_UI=1``).

Display size and fullscreen follow ``config.json`` → ``display``. Set env
``RUN_GUI_WINDOWED=1`` to force a window when ``display.fullscreen`` is true
(e.g. on a dev laptop).

Mic / therapy session needs **PortAudio** (``sounddevice``): use
``scripts/install_portaudio_apt.sh`` or set ``RUN_GUI_SKIP_PORTAUDIO_CHECK=1`` to
open the UI without a mic check. See README.
"""

import os
import sys
from pathlib import Path

_AGENT_DIR = Path(__file__).resolve().parent


def _find_repo_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / "agentic" / "graph.py").is_file():
            return p
    return start.parent


_REPO_ROOT = _find_repo_root(_AGENT_DIR)


def _load_env_files() -> None:
    """Load `.env` files so LangGraph / Supabase / Groq see keys before agentic imports.

    Order (later files override earlier): repo root → this package → backend/.
    """
    try:
        from dotenv import load_dotenv  # noqa: PLC0415
    except ImportError:
        return

    # Later files override earlier. Put execution_agent/.env last.
    # agentic/db/.env is used by some setups for GROQ_API (LangGraph / perception).
    candidates = [
        _REPO_ROOT / ".env",
        _REPO_ROOT / "backend" / ".env",
        _REPO_ROOT / "agentic" / "db" / ".env",
        _AGENT_DIR / ".env",
        _AGENT_DIR.parent / ".env",
    ]
    for path in candidates:
        if path.is_file():
            load_dotenv(path, override=True)


# Repo root on path helps imports when running from the execution_agent folder.
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Add src directory to path (Kivy is imported only after PortAudio check below).
sys.path.insert(0, str(Path(__file__).parent / "src"))


def _check_portaudio() -> None:
    """Fail fast with a clear message if system PortAudio is missing (mic / graph)."""
    if os.getenv("RUN_GUI_SKIP_PORTAUDIO_CHECK", "").lower() in ("1", "true", "yes"):
        return
    try:
        import sounddevice as sd  # noqa: PLC0415

        sd.query_devices()
    except ModuleNotFoundError as exc:
        here = Path(__file__).resolve().parent
        print(
            "\nERROR: Python package 'sounddevice' is not installed in this environment.\n"
            f"  requirements.txt for the agent is here: {here / 'requirements.txt'}\n"
            "  From repo root (if you use the top-level .venv):\n"
            "    .venv/bin/pip install -r execution_agent/requirements.txt\n"
            "  Or from the execution_agent folder:\n"
            "    .venv/bin/pip install -r requirements.txt\n",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc
    except OSError as exc:
        if "PortAudio" not in str(exc) and "portaudio" not in str(exc).lower():
            raise
        print(
            "\nERROR: PortAudio is not installed. Mic recording will fail.\n"
            "  Debian/Ubuntu: sudo bash scripts/install_portaudio_apt.sh\n"
            "  Or: sudo apt install -y libportaudio2 portaudio19-dev\n",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc


if __name__ == "__main__":
    _load_env_files()
    _check_portaudio()

    from ui.body_app import SpeechTherapyApp, load_display_config  # noqa: PLC0415

    project_root = Path(__file__).parent
    display = load_display_config(project_root)
    fullscreen = bool(display["fullscreen"])
    if os.getenv("RUN_GUI_WINDOWED", "").lower() in ("1", "true", "yes"):
        fullscreen = False

    app = SpeechTherapyApp(
        display_width=display["width"],
        display_height=display["height"],
        fullscreen=fullscreen,
    )
    app.run()
