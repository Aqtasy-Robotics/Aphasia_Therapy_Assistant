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

# ── Test 2: Message Generation ─────────────────────────────────
print("\n[TEST 2] Message Generation Functions")
print("-" * 60)

test_cases = [
    {
        'reason': 'silence',
        'word': 'cat',
        'expected_keywords': ['louder', 'speak', 'clearly'],
        'description': 'Silence detection message'
    },
    {
        'reason': 'noise',
        'word': 'dog',
        'expected_keywords': ['noise', 'quiet'],
        'description': 'Noise detection message'
    },
    {
        'reason': 'non_english',
        'word': 'apple',
        'expected_keywords': ['target', 'word', 'apple'],
        'description': 'Non-English detection message'
    },
    {
        'reason': None,
        'word': 'bird',
        'expected_keywords': [],
        'description': 'None (successful recording) message'
    }
]

all_passed = True
for i, test in enumerate(test_cases, 1):
    reason = test['reason']
    word = test['word']
    msg = _get_failure_reason_message(reason, word)
    
    # Check if expected keywords are present
    keywords_present = all(kw.lower() in msg.lower() for kw in test['expected_keywords'])
    
    status = "✅" if (keywords_present or reason is None) else "❌"
    all_passed = all_passed and (keywords_present or reason is None)
    
    print(f"\n  Test 2.{i}: {test['description']}")
    print(f"  Input: reason='{reason}', word='{word}'")
    print(f"  Message: {repr(msg[:70])}")
    if test['expected_keywords']:
        print(f"  Expected keywords: {test['expected_keywords']}")
        print(f"  Keywords found: {keywords_present}")
    print(f"  {status}")

if all_passed:
    print("\n✅ All message generation tests passed!")
else:
    print("\n❌ Some message generation tests failed!")
    sys.exit(1)

# ── Test 3: Edge Routing Logic ─────────────────────────────────
print("\n[TEST 3] Edge Routing with Perception Failure Reason")
print("-" * 60)

# Mock state for testing edge routing
mock_states = [
    {
        'name': 'Successful transcription (no failure reason)',
        'state': {
            'transcript': 'the cat sat',
            'confidence_score': -0.5,
            'retry_count': 0,
            'perception_failure_reason': None
        },
        'expected_route': 'analyze_phonemes'
    },
    {
        'name': 'Retryable failure (silence)',
        'state': {
            'transcript': 'the cat sat',
            'confidence_score': -1.5,
            'retry_count': 0,
            'perception_failure_reason': 'silence'
        },
        'expected_route': 're_record'
    },
    {
        'name': 'Retryable failure (noise)',
        'state': {
            'transcript': 'the cat sat',
            'confidence_score': -2.0,
            'retry_count': 1,
            'perception_failure_reason': 'noise'
        },
        'expected_route': 're_record'
    },
    {
        'name': 'Max retries exceeded',
        'state': {
            'transcript': '',
            'confidence_score': -3.0,
            'retry_count': 2,  # MAX_RECORD_RETRIES = 2
            'perception_failure_reason': 'silence'
        },
        'expected_route': 'therapist_review'
    }
]

routing_passed = True
for i, test_case in enumerate(mock_states, 1):
    state = test_case['state']
    result = check_transcription_quality(state)
    matched = result == test_case['expected_route']
    routing_passed = routing_passed and matched
    
    status = "✅" if matched else "❌"
    print(f"\n  Test 3.{i}: {test_case['name']}")
    print(f"  State: {state}")
    print(f"  Route returned: '{result}'")
    print(f"  Expected: '{test_case['expected_route']}'")
    print(f"  {status}")

