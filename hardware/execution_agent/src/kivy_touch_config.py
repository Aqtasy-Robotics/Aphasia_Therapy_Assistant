"""Configure Kivy keyboard behavior for touch and desktop runs."""

from __future__ import annotations

import os
import sys


def configure_kivy_touch() -> None:
    """Set Kivy keyboard mode before Kivy modules are imported."""
    try:
        from kivy.config import Config

        explicit = (os.getenv("KIVY_KEYBOARD_MODE") or "").strip().lower()
        if explicit in ("dock", "system"):
            mode = explicit
        elif sys.platform == "win32":
            mode = "system"
        else:
            mode = "dock"
        Config.set("kivy", "keyboard_mode", mode)
    except Exception:
        pass


__all__ = ["configure_kivy_touch"]

