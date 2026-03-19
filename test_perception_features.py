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

# ── Test 1: State Field ────────────────────────────────────────
print("\n[TEST 1] State Field Verification")
print("-" * 60)
fields = SpeechTherapyState.__annotations__
has_field = 'perception_failure_reason' in fields
print(f"perception_failure_reason in state: {has_field}")
if has_field:
    field_type = fields['perception_failure_reason']
    print(f"Field type: {field_type}")
    print("✅ State field exists and is properly typed")
else:
    print("❌ State field missing!")
    sys.exit(1)

