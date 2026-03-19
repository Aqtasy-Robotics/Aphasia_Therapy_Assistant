#!/usr/bin/env python
"""Test script for practice screen"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from ui.body_app import SpeechTherapyApp

if __name__ == "__main__":
    print("Starting Kivy app...")
    app = SpeechTherapyApp()
    print("App created, running...")
    app.run()
