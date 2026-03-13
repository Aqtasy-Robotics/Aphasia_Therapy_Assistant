"""
graph.py — Assembles and runs the full Speech Therapy LangGraph pipeline.

Run directly:
    python graph.py

Pipeline flow:
    perception → [confidence check] → phoneme_analysis
              → [error type route] → feedback_generation
              → [quality check]   → execution → END
"""

from __future__ import annotations
from asyncio import graph
import time

from langgraph.graph import StateGraph, END

from state import SpeechTherapyState
from nodes.perception_node import perception_node
from nodes.phoneme_node     import phoneme_analysis_node
from nodes.feedback_node    import feedback_generation_node
from nodes.execution_node   import execution_node
from nodes.history_node import history_node
from edges import (
    check_transcription_quality,
    route_by_error_type,
    check_feedback_quality,
)


def build_graph() -> "CompiledGraph":
    """Construct and compile the LangGraph state machine."""

    graph = StateGraph(SpeechTherapyState)


    # ── Register nodes ───────────────────────────────────────────
    graph.add_node("perception",          perception_node)
    graph.add_node("phoneme_analysis",    phoneme_analysis_node)
    graph.add_node("feedback_generation", feedback_generation_node)
    graph.add_node("execution",           execution_node)
    graph.add_node("history_analysis", history_node)
    graph.add_edge("phoneme_analysis", "history_analysis")
    graph.add_edge("history_analysis", "feedback_generation")

    # ── Entry point ──────────────────────────────────────────────
    graph.set_entry_point("perception")

    # ── Edge: perception → quality check ────────────────────────
    graph.add_conditional_edges(
        "perception",
        check_transcription_quality,
        {
            "re_record":       "perception",        # loops back
            "analyze_phonemes":"phoneme_analysis",
        },
    )

    # ── Edge: phoneme_analysis → error-type routing ──────────────
    graph.add_conditional_edges(
        "phoneme_analysis",
        route_by_error_type,
        {
            # Both paths currently go to the same node;
            # semantic_label in state lets the node adapt its prompt.
            "deep_feedback":     "feedback_generation",
            "standard_feedback": "feedback_generation",
        },
    )

    # ── Edge: feedback_generation → quality check ────────────────
    graph.add_conditional_edges(
        "feedback_generation",
        check_feedback_quality,
        {
            "retry_feedback": "feedback_generation",   # loops back
            "execute":        "execution",
        },
    )

    # ── Terminal edge ─────────────────────────────────────────────
    graph.add_edge("execution", END)

    return graph.compile()


def run_session() -> SpeechTherapyState:
    """Collect session inputs, build graph, invoke pipeline, return final state."""

    print("\n" + "═" * 55)
    print("  SPEECH THERAPY AGENT  —  Session Start")
    print("═" * 55)

    target_word  = input("Enter the target word for this session: ").strip()
    patient_name = input("Enter patient name (or press Enter for 'friend'): ").strip() or "friend"
    patient_id   = input("Enter Supabase profiles.id UUID for the patient (required to save to DB): ").strip() or None
    assignment_id = input("Enter therapist_assignments.id UUID (optional, press Enter to skip): ").strip() or None

    initial_state: SpeechTherapyState = {
        # Perception
        "audio_path":        None,
        "transcript":        None,
        "confidence_score":  None,
        "retry_count":       0,

        # Session meta
        "target_word":       target_word,
        "patient_name":      patient_name,

        # Session identity (Supabase linkage)
        # `patient_id` must correspond to an existing row in the
        # `patients` table for persistence to succeed.
        "patient_id":        patient_id,
        "assignment_id":     assignment_id,
        "word_source":       "therapist",
        "session_start":     time.time(),
        "session_duration_secs": None,

        # Report
        "report_id":         None,

        # Phoneme analysis
        "target_phonemes":   None,
        "attempt_phonemes":  None,
        "error_report":      None,
        "semantic_label":    None,

        # Feedback
        "feedback":          None,
        "practice_exercise": None,
        "feedback_attempts": 0,

        # Execution
        "audio_output_path": None,
        "session_complete":  False,

        # Control
        "current_error":     None,

        # History / progress
        "session_history":   [],
        "patient_trend":     None,
        "sessions_done":     0,
    }

    app          = build_graph()
    final_state  = app.invoke(initial_state)

    print("\n✅ Session complete.")
    if final_state.get("report_id"):
        print(f"Supabase session report id: {final_state['report_id']}")
    return final_state


if __name__ == "__main__":
    run_session()
