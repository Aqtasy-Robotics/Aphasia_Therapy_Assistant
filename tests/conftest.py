"""Shared pytest configuration.

Several ``agentic`` modules read ``GROQ_API`` at import time; set keys before
any test module imports them.
"""

from __future__ import annotations

import os

if not os.getenv("GROQ_API"):
    os.environ["GROQ_API"] = "test-key-pytest"
if not os.getenv("GROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = "test-key-pytest"
