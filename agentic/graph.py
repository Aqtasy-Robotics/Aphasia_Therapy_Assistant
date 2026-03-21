"""graph.py — Assembles and runs the full Speech Therapy LangGraph pipeline.

Run directly:
    python graph.py

High-level pipeline flow:
    perception → [confidence check] → phoneme_analysis
              → history_analysis    → [error type route]
              → feedback_generation → [quality check]
              → execution           → [post-execution routing]
              → success | hard_stop | therapist_review → END
"""

from __future__ import annotations  # enable postponed evaluation of type annotations
#from asyncio import graph  # imported but unused; kept to mirror original file structure
import time  # used to timestamp session start and compute duration

from langgraph.graph import StateGraph, END  # core LangGraph primitives for building the state machine

from state import SpeechTherapyState  # shared TypedDict that defines the graph's state
from db.supabase_store import (
    fetch_patient_id_by_name,
    fetch_target_words_for_patient,
    fetch_personalization_config,
    persist_session_state,
)  # helpers to resolve patient identity and target words from Supabase
from nodes.perception_node import perception_node      # node that records audio and runs Whisper
from nodes.phoneme_node     import phoneme_analysis_node  # node that performs phoneme/semantic analysis
from nodes.feedback_node    import feedback_generation_node  # node that generates explanatory feedback
from nodes.execution_node   import execution_node      # node that delivers feedback (e.g., TTS)
from nodes.history_node     import history_node        # node that summarises cross-session history
from nodes.therapist_review_node import therapist_review_node  # new node for human-in-the-loop escalation
from nodes.terminal_nodes       import success_node, hard_stop_node  # new nodes representing explicit terminal outcomes
from edges import (
    check_transcription_quality,  # router for perception → re-record / analyze / escalate
    route_by_error_type,          # router for phoneme_analysis → deep vs standard feedback
    check_feedback_quality,       # router for feedback_generation → retry / execute / escalate
    route_after_execution,        # new router deciding what happens after execution
)


def build_graph():
    """Construct and compile the LangGraph state machine.

    Returns a compiled graph object that can be invoked with
    an initial SpeechTherapyState to run a full therapy session.
    """

    graph = StateGraph(SpeechTherapyState)  # create a new state graph using our TypedDict as the schema


    # ── Register nodes ───────────────────────────────────────────
    graph.add_node("perception",          perception_node)       # record audio and transcribe it
    graph.add_node("phoneme_analysis",    phoneme_analysis_node) # analyse phonemes / semantics of the attempt
    graph.add_node("feedback_generation", feedback_generation_node)  # generate text feedback and practice tasks
    graph.add_node("execution",           execution_node)        # deliver feedback (e.g., via TTS)
    graph.add_node("history_analysis",    history_node)          # look at session history to compute trends
    graph.add_node("therapist_review",    therapist_review_node) # terminal node for human escalation
    graph.add_node("success",             success_node)          # terminal node for successful completion
    graph.add_node("hard_stop",           hard_stop_node)        # terminal node for early stop due to issues

    # Connect phoneme analysis to history analysis and then to feedback.
    graph.add_edge("phoneme_analysis", "history_analysis")      # after phoneme analysis, update / inspect history
    graph.add_edge("history_analysis",   "feedback_generation") # then move into feedback generation

    # ── Entry point ──────────────────────────────────────────────
    graph.set_entry_point("perception")   # the graph always starts by recording and transcribing audio

    # ── Edge: perception → quality check ────────────────────────
    graph.add_conditional_edges(
        "perception",                     # source node name
        check_transcription_quality,       # router function that inspects the state
        {
            "re_record":        "perception",       # loops back to perception when quality is poor
            "analyze_phonemes": "phoneme_analysis", # proceeds to phoneme analysis when quality is OK
            "therapist_review": "therapist_review", # new branch: escalate to human after too many failures
        },
    )

    # ── Edge: history_analysis → error-type routing ──────────────
    graph.add_conditional_edges(
        "history_analysis",               # source node name
        route_by_error_type,               # router that decides which feedback depth to use
        {
            # Both paths currently go to the same node;
            # semantic_label in state lets the node adapt its prompt.
            "deep_feedback":     "feedback_generation",  # path used when deep feedback is needed
            "standard_feedback": "feedback_generation",  # path used for standard feedback
        },
    )

    # ── Edge: feedback_generation → quality check ────────────────
    graph.add_conditional_edges(
        "feedback_generation",            # source node name
        check_feedback_quality,            # router that scores the feedback
        {
            "retry_feedback":   "feedback_generation",  # loop: ask LLM to try generating feedback again
            "execute":          "execution",            # proceed to execution when feedback is good enough
            "therapist_review": "therapist_review",     # escalate to human if feedback keeps failing
        },
    )

    # ── Edge: execution → post-execution routing ─────────────────
    graph.add_conditional_edges(
        "execution",                       # source node name
        route_after_execution,              # router that inspects trend / fatigue after delivery
        {
            "continue_session":   "perception",        # continue another attempt with current difficulty
            "adjust_difficulty":  "perception",        # placeholder: later insert a difficulty-selection node
            "success":            "success",           # mark the session as a success
            "hard_stop":          "hard_stop",         # end early due to fatigue or other issues
        },
    )

    # ── Terminal edges ───────────────────────────────────────────
    graph.add_edge("success",          END)  # once success_node runs, the graph terminates
    graph.add_edge("hard_stop",        END)  # once hard_stop_node runs, the graph terminates
    graph.add_edge("therapist_review", END)  # once therapist_review_node runs, the graph terminates

    return graph.compile()  # return a compiled, ready-to-run LangGraph application


def _build_initial_state(
    *,
    patient_name: str,
    patient_id: str,
    assignment_id: str | None,
    personalization: dict,
    target_words: list[str],
) -> SpeechTherapyState:
    target_word = target_words[0] if target_words else ""
    return {
        # Perception
        "audio_path":        None,
        "transcript":        None,
        "confidence_score":  None,
        "retry_count":       0,
        "perception_failure_reason": None,
        "transcript_attempts": [],

        # Session meta
        "target_word":       target_word,
        "target_words":      target_words,
        "current_target_index": 0,
        "has_more_target_words": len(target_words) > 1,
        "patient_name":      patient_name,
        "therapy_goals":     personalization.get("therapy_goals") or [],
        "phonemes_to_focus_on": personalization.get("phonemes_to_focus_on") or [],
        "difficulty_level":  personalization.get("difficulty_level") or "medium",

        # Session identity (Supabase linkage)
        "patient_id":        patient_id,
        "assignment_id":     assignment_id,
        "word_source":       "sessions_table",
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
        "session_outcome":   None,
        "fatigue_level":     0,

        # Control
        "current_error":     None,

        # History / progress
        "session_history":   [],
        "memory_context":    [],
        "patient_trend":     None,
        "sessions_done":     0,
    }


def run_session_for_patient(
    *,
    patient_name: str,
    assignment_id: str | None = None,
) -> SpeechTherapyState:
    """Programmatic graph entrypoint used by GUI integration.

    Raises:
        ValueError: if patient cannot be resolved.
    """
    patient_name = (patient_name or "").strip()
    if not patient_name:
        raise ValueError("Patient name is required.")

    patient_id = fetch_patient_id_by_name(patient_name)
    if not patient_id:
        raise ValueError(
            f"Could not resolve patient '{patient_name}'. Check profiles.full_name and role='patient'."
        )

    personalization = fetch_personalization_config(
        patient_id=patient_id,
        assignment_id=assignment_id,
    )
    target_words = fetch_target_words_for_patient(patient_id)
    if not target_words:
        raise ValueError(
            "No target words found in Supabase sessions.target_words for this patient."
        )

    initial_state = _build_initial_state(
        patient_name=patient_name,
        patient_id=patient_id,
        assignment_id=assignment_id,
        personalization=personalization,
        target_words=target_words,
    )
    app = build_graph()
    final_state = app.invoke(initial_state)
    report_id = persist_session_state(final_state)
    if report_id:
        final_state["report_id"] = report_id
    return final_state  # type: ignore[return-value]


def run_session() -> SpeechTherapyState:
    """Collect session inputs, build the graph, run a session, and return the final state."""

    print("\n" + "═" * 55)  # decorative separator line before the session header
    print("  SPEECH THERAPY AGENT  —  Session Start")  # human-readable banner for the CLI
    print("═" * 55)  # closing separator line

    # Prompt the therapist for the patient name, then resolve profiles.id.
    patient_name: str = ""
    patient_id: str = ""
    while not patient_id:
        patient_name = input("Enter patient full name (as stored in profiles.full_name): ").strip()
        if not patient_name:
            print("Patient name is required. Please try again.")
            continue

        resolved_id = fetch_patient_id_by_name(patient_name)
        if resolved_id:
            patient_id = resolved_id
            print(f"[session] Resolved patient '{patient_name}' -> profiles.id {patient_id}")
        else:
            print(
                "[session] Could not resolve patient name to a profiles.id. "
                "Please check spelling and that role='patient'."
            )

    assignment_id = input(
        "Enter therapist_assignments.id UUID (optional, press Enter to skip): "
    ).strip() or None  # optional assignment linkage

    try:
        final_state = run_session_for_patient(
            patient_name=patient_name,
            assignment_id=assignment_id,
        )
    except ValueError as exc:
        print(f"[session] {exc}")
        raise

    print("\n✅ Session complete.")  # let the operator know the graph finished
    history = final_state.get("session_history") or []
    if history:
        total_words = len(history)
        avg_accuracy = sum(float(h.get("accuracy", 0) or 0) for h in history) / max(total_words, 1)
        words = [str(h.get("target_word", "")).strip() for h in history if str(h.get("target_word", "")).strip()]

        print("\n" + "═" * 55)
        print("  SESSION OVERALL SUMMARY")
        print("═" * 55)
        if words:
            print(f"  Target words practiced: {', '.join(words)}")
        print(f"  Words practiced      : {total_words}")
        print(f"  Average accuracy     : {avg_accuracy:.2f}%")
        for idx, item in enumerate(history, 1):
            w = item.get("target_word", "")
            acc = item.get("accuracy", 0)
            err = item.get("total_errors", 0)
            print(f"  {idx}. {w}  | accuracy={acc}% | errors={err}")
        print("═" * 55)

    if final_state.get("report_id"):
        print(f"Supabase session report id: {final_state['report_id']}")  # show the Supabase report ID if persistence succeeded
    if final_state.get("session_outcome"):
        print(f"Session outcome: {final_state['session_outcome']}")       # show the explicit outcome label for this run
    return final_state  # type: ignore # hand the final state back to the caller (for tests / further inspection)


if __name__ == "__main__":
    run_session()  # execute the session when this script is run directly