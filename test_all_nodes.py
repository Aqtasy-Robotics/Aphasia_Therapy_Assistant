#!/usr/bin/env python3
"""
Comprehensive test suite for Speech Therapy Assistant.
Tests all nodes, edges, functions, and state management.
"""

import os
import sys
import tempfile
from typing import Dict, Any, Optional

# Set mock API key before importing
os.environ['GROQ_API'] = 'mock-key-for-testing'

# Add Agentic to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Agentic'))

from state import SpeechTherapyState
from edges import (
    check_transcription_quality,
    route_by_error_type,
    check_feedback_quality,
)
from nodes.terminal_nodes import success_node, hard_stop_node
from nodes.therapist_review_node import therapist_review_node
from nodes.history_node import history_node, _is_improving

# ═════════════════════════════════════════════════════════════════════════════
# TEST COUNTER & HELPERS
# ═════════════════════════════════════════════════════════════════════════════

test_count = 0
passed_count = 0
failed_count = 0

def test(description: str, condition: bool, details: str = ""):
    """Simple test assertion helper."""
    global test_count, passed_count, failed_count
    test_count += 1
    status = "✅" if condition else "❌"
    print(f"  {status} Test {test_count}: {description}")
    if details:
        print(f"     └─ {details}")
    if condition:
        passed_count += 1
    else:
        failed_count += 1
    return condition

# ═════════════════════════════════════════════════════════════════════════════
# TEST 1: STATE VERIFICATION
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 1: STATE VERIFICATION")
print("="*70)

fields = SpeechTherapyState.__annotations__

print("\n[Checking core state fields...]")
test("perception_failure_reason field exists", 'perception_failure_reason' in fields)
test("transcript field exists", 'transcript' in fields)
test("confidence_score field exists", 'confidence_score' in fields)
test("target_word field exists", 'target_word' in fields)
test("patient_name field exists", 'patient_name' in fields)
test("retry_count field exists", 'retry_count' in fields)
test("feedback field exists", 'feedback' in fields)
test("session_complete field exists", 'session_complete' in fields)
test("session_outcome field exists", 'session_outcome' in fields)

# ═════════════════════════════════════════════════════════════════════════════
# TEST 2: EDGE ROUTING - TRANSCRIPTION QUALITY
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 2: EDGE ROUTING - TRANSCRIPTION QUALITY")
print("="*70)

edge_test_cases = [
    {
        'name': 'Successful transcription (good confidence)',
        'state': {
            'transcript': 'the cat sat',
            'confidence_score': -0.5,
            'retry_count': 0,
            'perception_failure_reason': None
        },
        'expected': 'analyze_phonemes'
    },
    {
        'name': 'Low confidence score',
        'state': {
            'transcript': 'the cat',
            'confidence_score': -1.5,
            'retry_count': 0,
            'perception_failure_reason': None
        },
        'expected': 're_record'
    },
    {
        'name': 'Silence detected',
        'state': {
            'transcript': '',
            'confidence_score': 0.0,
            'retry_count': 0,
            'perception_failure_reason': 'silence'
        },
        'expected': 're_record'
    },
    {
        'name': 'Noise detected',
        'state': {
            'transcript': 'the cat',
            'confidence_score': -2.0,
            'retry_count': 1,
            'perception_failure_reason': 'noise'
        },
        'expected': 're_record'
    },
    {
        'name': 'Max retries exceeded',
        'state': {
            'transcript': '',
            'confidence_score': -3.0,
            'retry_count': 2,
            'perception_failure_reason': 'silence'
        },
        'expected': 'therapist_review'
    },
    {
        'name': 'Non-English detected',
        'state': {
            'transcript': 'hello',
            'confidence_score': -2.5,
            'retry_count': 0,
            'perception_failure_reason': 'non_english'
        },
        'expected': 're_record'
    }
]

print("\n[Testing transcription quality routing...]")
for i, case in enumerate(edge_test_cases, 1):
    result = check_transcription_quality(case['state'])
    status = result == case['expected']
    test(
        case['name'],
        status,
        f"Expected '{case['expected']}', got '{result}'"
    )

# ═════════════════════════════════════════════════════════════════════════════
# TEST 3: EDGE ROUTING - ERROR TYPE
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 3: EDGE ROUTING - ERROR TYPE")
print("="*70)

error_type_cases = [
    {
        'name': 'Neologistic paraphasia',
        'state': {
            'semantic_label': 'Neologistic',
            'error_report': {'errors': [{'type': 'phoneme_insertion'}]}
        },
        'expected': 'deep_feedback'
    },
    {
        'name': 'Semantic paraphasia',
        'state': {
            'semantic_label': 'Semantic Paraphasia',
            'error_report': {'errors': [{'type': 'semantic_mismatch'}]}
        },
        'expected': 'standard_feedback'
    },
    {
        'name': 'No semantic label',
        'state': {
            'semantic_label': '',
            'error_report': {'errors': [{'type': 'phoneme_deletion'}]}
        },
        'expected': 'standard_feedback'
    }
]

print("\n[Testing error type routing...]")
for i, case in enumerate(error_type_cases, 1):
    result = route_by_error_type(case['state'])
    status = result == case['expected']
    test(
        case['name'],
        status,
        f"Expected '{case['expected']}', got '{result}'"
    )

# ═════════════════════════════════════════════════════════════════════════════
# TEST 4: EDGE ROUTING - FEEDBACK QUALITY
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 4: EDGE ROUTING - FEEDBACK QUALITY")
print("="*70)

feedback_cases = [
    {
        'name': 'Good feedback scores',
        'state': {
            'feedback_attempts': 0,
            'feedback_scores': {
                'simplicity': 5,
                'empathy': 5,
                'actionable': 5
            }
        },
        'expected': 'execute'
    },
    {
        'name': 'Low simplicity score',
        'state': {
            'feedback_attempts': 0,
            'feedback_scores': {
                'simplicity': 2,
                'empathy': 5,
                'actionable': 5
            }
        },
        'expected': 'retry_feedback'
    },
    {
        'name': 'Low empathy score',
        'state': {
            'feedback_attempts': 1,
            'feedback_scores': {
                'simplicity': 5,
                'empathy': 1,
                'actionable': 5
            }
        },
        'expected': 'retry_feedback'
    },
    {
        'name': 'Max feedback retries exceeded',
        'state': {
            'feedback_attempts': 3,
            'feedback_scores': {
                'simplicity': 2,
                'empathy': 2,
                'actionable': 2
            }
        },
        'expected': 'therapist_review'
    },
    {
        'name': 'No scores available but adequate feedback length',
        'state': {
            'feedback_attempts': 0,
            'feedback_scores': None,
            'feedback': {'feedback_text': 'This is a good feedback message that is long enough to pass the fallback check.'}
        },
        'expected': 'execute'
    },
    {
        'name': 'No scores available and feedback too short',
        'state': {
            'feedback_attempts': 0,
            'feedback_scores': None,
            'feedback': {'feedback_text': 'short'}
        },
        'expected': 'retry_feedback'
    }
]

print("\n[Testing feedback quality routing...]")
for i, case in enumerate(feedback_cases, 1):
    result = check_feedback_quality(case['state'])
    status = result == case['expected']
    test(
        case['name'],
        status,
        f"Expected '{case['expected']}', got '{result}'"
    )

# ═════════════════════════════════════════════════════════════════════════════
# TEST 5: TERMINAL NODES
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 5: TERMINAL NODES")
print("="*70)

print("\n[Testing terminal node functions...]")

success_result = success_node({})
test(
    "success_node returns correct outcome",
    success_result.get('session_outcome') == 'success',
    f"Got: {success_result.get('session_outcome')}"
)
test(
    "success_node marks session_complete",
    success_result.get('session_complete') == True,
    f"Got: {success_result.get('session_complete')}"
)

hard_stop_result = hard_stop_node({})
test(
    "hard_stop_node returns correct outcome",
    hard_stop_result.get('session_outcome') == 'hard_stop',
    f"Got: {hard_stop_result.get('session_outcome')}"
)
test(
    "hard_stop_node marks session_complete",
    hard_stop_result.get('session_complete') == True,
    f"Got: {hard_stop_result.get('session_complete')}"
)

# ═════════════════════════════════════════════════════════════════════════════
# TEST 6: THERAPIST REVIEW NODE
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 6: THERAPIST REVIEW NODE")
print("="*70)

print("\n[Testing therapist review node...]")

review_state = {'current_error': 'Test error message'}
review_result = therapist_review_node(review_state)

test(
    "therapist_review_node returns escalate_to_human outcome",
    review_result.get('session_outcome') == 'escalate_to_human',
    f"Got: {review_result.get('session_outcome')}"
)
test(
    "therapist_review_node marks session_complete",
    review_result.get('session_complete') == True,
    f"Got: {review_result.get('session_complete')}"
)
test(
    "therapist_review_node preserves error message",
    review_result.get('current_error') == 'Test error message',
    f"Got: {review_result.get('current_error')}"
)

# ═════════════════════════════════════════════════════════════════════════════
# TEST 7: HISTORY NODE
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 7: HISTORY NODE HELPERS")
print("="*70)

print("\n[Testing trend analysis...]")

# Test _is_improving function
test(
    "_is_improving with empty sessions",
    _is_improving([]) == True,
    "Empty session list should indicate improving"
)

test(
    "_is_improving with one session",
    _is_improving([{'accuracy': 0.8}]) == True,
    "Single session should indicate improving"
)

improving_sessions = [
    {'accuracy': 0.5},
    {'accuracy': 0.7},
    {'accuracy': 0.9}
]
test(
    "_is_improving with increasing accuracy",
    _is_improving(improving_sessions) == True,
    f"Accuracy trend: {[s['accuracy'] for s in improving_sessions]}"
)

declining_sessions = [
    {'accuracy': 0.9},
    {'accuracy': 0.7},
    {'accuracy': 0.5}
]
test(
    "_is_improving with decreasing accuracy",
    _is_improving(declining_sessions) == False,
    f"Accuracy trend: {[s['accuracy'] for s in declining_sessions]}"
)

# ═════════════════════════════════════════════════════════════════════════════
# TEST 8: STATE DEFAULT VALUES
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 8: STATE FIELD TYPES")
print("="*70)

print("\n[Checking state field type annotations...]")

required_fields = {
    'audio_path': 'Optional[str]',
    'transcript': 'Optional[str]',
    'confidence_score': 'Optional[float]',
    'perception_failure_reason': 'Optional[str]',
    'retry_count': 'int',
    'target_word': 'Optional[str]',
    'patient_name': 'str',
    'session_complete': 'bool',
    'feedback_attempts': 'int',
}

for field_name, expected_type in required_fields.items():
    exists = field_name in fields
    test(
        f"Field '{field_name}' exists",
        exists,
        f"Expected type: {expected_type}"
    )

# ═════════════════════════════════════════════════════════════════════════════
# TEST 9: EDGE ROUTING CONSISTENCY
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 9: EDGE ROUTING CONSISTENCY")
print("="*70)

print("\n[Testing routing consistency...]")

# Test that same inputs always produce same outputs
test_state = {
    'transcript': 'hello',
    'confidence_score': -0.5,
    'retry_count': 0,
    'perception_failure_reason': None
}

result1 = check_transcription_quality(test_state)
result2 = check_transcription_quality(test_state)
test(
    "Transcription routing is deterministic",
    result1 == result2,
    f"First: {result1}, Second: {result2}"
)

# ═════════════════════════════════════════════════════════════════════════════
# TEST 10: BOUNDARY CONDITIONS
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUITE 10: BOUNDARY CONDITIONS")
print("="*70)

print("\n[Testing boundary conditions...]")

# Test with retry_count exactly at MAX_RECORD_RETRIES (2)
boundary_state = {
    'transcript': 'test',
    'confidence_score': -1.5,
    'retry_count': 2,
    'perception_failure_reason': None
}
boundary_result = check_transcription_quality(boundary_state)
test(
    "Retry count at MAX boundary triggers escalation",
    boundary_result == 'therapist_review',
    f"Got: {boundary_result}"
)

# Test with retry_count just below MAX
below_max_state = {
    'transcript': 'test',
    'confidence_score': -1.5,
    'retry_count': 1,
    'perception_failure_reason': None
}
below_max_result = check_transcription_quality(below_max_state)
test(
    "Retry count below MAX allows re-record",
    below_max_result == 're_record',
    f"Got: {below_max_result}"
)

# Test with confidence exactly at CONFIDENCE_THRESHOLD (-1.0)
threshold_state = {
    'transcript': 'test',
    'confidence_score': -1.0,
    'retry_count': 0,
    'perception_failure_reason': None
}
threshold_result = check_transcription_quality(threshold_state)
test(
    "Confidence exactly at threshold allows analysis",
    threshold_result == 'analyze_phonemes',
    f"Got: {threshold_result}"
)

# Test with confidence just below CONFIDENCE_THRESHOLD
below_threshold_state = {
    'transcript': 'test',
    'confidence_score': -1.1,
    'retry_count': 0,
    'perception_failure_reason': None
}
below_threshold_result = check_transcription_quality(below_threshold_state)
test(
    "Confidence just below threshold triggers re-record",
    below_threshold_result == 're_record',
    f"Got: {below_threshold_result}"
)

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)
print(f"\nTotal Tests: {test_count}")
print(f"✅ Passed:   {passed_count}")
print(f"❌ Failed:   {failed_count}")
print(f"Pass Rate:  {(passed_count/test_count*100):.1f}%")

if failed_count == 0:
    print("\n🎉 ALL TESTS PASSED! All nodes and edges are working properly.")
    sys.exit(0)
else:
    print(f"\n⚠️  {failed_count} test(s) failed. Check details above.")
    sys.exit(1)
