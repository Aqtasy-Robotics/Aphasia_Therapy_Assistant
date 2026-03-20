#!/usr/bin/env python
"""Test script for practice screen"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from ui.body_app import SpeechTherapyApp, show_ui

if __name__ == "__main__":
    print("Starting Kivy app...")
    import asyncio

    asyncio.run(
        show_ui(
            {
                "screen": "practice_word",
                "words": ["Cat", "Table", "Orange", "Water"],
                "current_index": 0,
                "category": "objects",
            }
        )
    )
    app = SpeechTherapyApp()
    print("App created, running...")
    app.run()
