"""therapist_review_node.py — LangGraph node for human escalation.

This node is reached when automated steps (transcription / feedback)
fail too many times or look unreliable. It marks the session as
complete and tags the outcome so that a human therapist can later
inspect and act on the session.
"""

from __future__ import annotations  # enable postponed evaluation of annotations

from typing import Dict, Any  # typing aliases used for the return type

from agentic.state import SpeechTherapyState


def therapist_review_node(state: SpeechTherapyState) -> Dict[str, Any]:
    """Mark the session as escalated to a human therapist.

    Args:
        state: Current SpeechTherapyState coming into this node.

    Returns:
        A partial state update (dict) that LangGraph will merge
        into the overall session state.
    """
    print("[therapist_review] Escalating this session to a human therapist.")  # log routing decision for observability

    # Return only the keys this node is responsible for changing.
    # LangGraph will merge this into the running state.
    return {
        "session_outcome": "escalate_to_human",  # classify why the session finished
        "session_complete": True,                 # mark that no further automated steps should run
        "current_error": state.get("current_error"),  # preserve any existing error message for the therapist
    }
