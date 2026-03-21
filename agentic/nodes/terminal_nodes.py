"""terminal_nodes.py — LangGraph nodes representing explicit terminal states.

These nodes are reached when the graph has decided that a session
should end successfully or should end early with a hard stop.
They simply tag the final outcome and mark the session as complete.
"""

from __future__ import annotations  # enable postponed evaluation of annotations

from typing import Dict, Any  # typing aliases used for the return type

from agentic.state import SpeechTherapyState


def success_node(state: SpeechTherapyState) -> Dict[str, Any]:
    """Mark the session as successfully finished.

    Args:
        state: Current SpeechTherapyState (unused, but kept for API consistency).

    Returns:
        A partial state update indicating a successful session outcome.
    """
    print("[terminal] Marking session as SUCCESS.")  # log that we reached the success terminal node
    return {
        "session_outcome": "success",  # label the outcome so downstream systems can distinguish it
        "session_complete": True,       # indicate that the LangGraph session has ended
    }


def hard_stop_node(state: SpeechTherapyState) -> Dict[str, Any]:
    """Mark the session as ending early with a hard stop.

    Args:
        state: Current SpeechTherapyState (unused, but kept for API consistency).

    Returns:
        A partial state update indicating the session ended before ideal completion.
    """
    print("[terminal] Marking session as HARD_STOP (ended early).")  # log that we hit the hard-stop path
    return {
        "session_outcome": "hard_stop",  # label outcome as a hard stop for later analysis
        "session_complete": True,         # indicate that the LangGraph session has ended
    }
