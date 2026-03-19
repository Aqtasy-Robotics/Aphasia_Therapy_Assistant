#!/usr/bin/env python
"""Launcher script for the speech therapy GUI."""

import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import and run
from ui.body_app import SpeechTherapyApp

if __name__ == "__main__":
    app = SpeechTherapyApp()
    app.run()
