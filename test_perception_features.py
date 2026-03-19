#!/usr/bin/env python3
"""
Verification test for perception_failure_reason feature.
Tests state fields, message generation, and edge routing logic.
"""

import os
import sys

# Set mock API key before importing
os.environ['GROQ_API'] = 'mock-key-for-testing'

# Add Agentic to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Agentic'))

from state import SpeechTherapyState
from nodes.execution_node import _get_failure_reason_message
from edges import check_transcription_quality

print("\n" + "="*60)
print("PERCEPTION FAILURE REASON FEATURE - VERIFICATION TEST")
print("="*60)

