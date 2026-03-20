#!/usr/bin/env python
"""Launcher script for the speech therapy GUI."""

import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import and run
from ui.body_app import SpeechTherapyApp, load_display_config

if __name__ == "__main__":
    display = load_display_config(Path(__file__).parent)
    app = SpeechTherapyApp(
        display_width=display["width"],
        display_height=display["height"],
        fullscreen=False,
    )
    app.run()
