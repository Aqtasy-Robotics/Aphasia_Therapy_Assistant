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
from asyncio import graph  # imported but unused; kept to mirror original file structure
import time  # used to timestamp session start and compute duration

from langgraph.graph import StateGraph, END  # core LangGraph primitives for building the state machine

from state import SpeechTherapyState  # shared TypedDict that defines the graph's state
from db.supabase_store import (
    fetch_patient_id_by_name,
    fetch_latest_session_config,
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

    # Fetch personalization from sessions using the patient_id resolved from name input.
    personalization = fetch_personalization_config(
        patient_id=patient_id,
    )

    # Fetch latest session mode + targets for this patient from sessions.
    session_config = fetch_latest_session_config(patient_id)
    target_words = list(session_config.get("target_words") or [])
    target_sentence = str(session_config.get("target_sentence") or "").strip() or None
    session_type = str(session_config.get("session_type") or "word_level").strip().lower()
    if target_words:
        session_type = "word_level"
        mode_source = "target_words"
    elif target_sentence:
        session_type = "sentence_level"
        mode_source = "target_sentence"
    else:
        session_type = "word_level"
        mode_source = "fallback_empty_targets"

    target_items = target_words if session_type == "word_level" else ([target_sentence] if target_sentence else [])
    target_word = target_items[0] if target_items else ""

    if not target_items:
        target_column = "target_sentence/target_words"
        print(
            f"[session] Warning: No {target_column} found in Supabase for this patient. "
            "The session will continue with an empty target value, which may degrade analysis quality."
        )
    else:
        target_label = "sentence(s)" if session_type == "sentence_level" else "word(s)"
        print(
            f"[session] Loaded {len(target_items)} target {target_label} "
            f"for mode={session_type}. Starting with: '{target_word}'"
        )
    print(f"[session] Mode selected: {session_type} (from {mode_source})")

    # Build the initial state dict that seeds the LangGraph run.
    initial_state: SpeechTherapyState = {
        # Perception
        "audio_path":        None,          # will hold path to the latest recorded audio file
        "transcript":        None,          # will hold the latest transcribed text
        "confidence_score":  None,          # will store confidence proxy from Whisper
        "retry_count":       0,             # start with zero re-record attempts
        "transcript_attempts": [],          # store all transcript attempts across re-record loops

        # Session meta
        "session_type":      session_type,
        "target_word":       target_word,   # store the word the patient should say
        "target_words":      target_words,  # ordered list from sessions.target_words
        "target_sentence":   target_sentence,  # active sentence target for sentence_level mode
        "target_items":      target_items,  # mode-resolved ordered target list
        "current_target_index": 0,          # begin with the first array element
        "has_more_target_words": len(target_items) > 1,
        "patient_name":      patient_name,  # personalise feedback by name
        "therapy_goals":     personalization["therapy_goals"],        # loaded from latest sessions row for this patient_id
        "phonemes_to_focus_on": personalization["phonemes_to_focus_on"],  # prioritized phonemes from latest sessions row
        "difficulty_level":  personalization["difficulty_level"],     # easy | medium | hard

        # Session identity (Supabase linkage)
        # `patient_id` must correspond to an existing row in
        # `profiles` for persistence and lookups to succeed.
        "patient_id":        patient_id,    # link state to a concrete patient record
        "assignment_id":     assignment_id, # optional link to a therapist assignment row
        "word_source":       "sessions_table",  # label that the target word came from Supabase sessions
        "session_start":     time.time(),   # timestamp when this session started
        "session_duration_secs": None,      # will be filled once the session finishes

        # Report
        "report_id":         None,          # Supabase session_reports.id, set by execution/persistence

        # Phoneme analysis
        "target_phonemes":   None,          # phoneme sequence for the target word
        "attempt_phonemes":  None,          # phoneme sequence for the patient's attempt
        "error_report":      None,          # detailed analysis of where phonemes differ
        "semantic_label":    None,          # high-level semantic error classification

        # Feedback
        "feedback":          None,          # full feedback payload returned from the LLM
        "practice_exercise": None,          # text describing a follow-up practice exercise
        "feedback_attempts": 0,             # how many times feedback generation has been retried

        # Execution
        "audio_output_path": None,          # path to generated TTS audio (if any)
        "session_complete":  False,         # will be flipped to True by a terminal node
        "session_outcome":   None,          # will be set to 'success' / 'hard_stop' / 'escalate_to_human'
        "fatigue_level":     0,             # starting fatigue level; can be updated by nodes over time

        # Control
        "current_error":     None,          # most recent error message, if something went wrong
        "failure_reason":    None,          # reason for recent failed perception attempt (if any)

        # History / progress
        "session_history":   [],            # list of previous session summaries for this patient
        "memory_context":    [],            # relevant prior sessions fetched from Mem0
        "patient_trend":     None,          # overall progress trend, filled by history_analysis
        "sessions_done":     0,             # count of sessions completed so far
    }

    app         = build_graph()             # compile the LangGraph state machine
    final_state = app.invoke(initial_state) # run the full session starting from the initial state

    # Persist one aggregated row for the whole multi-word session.
    report_id = persist_session_state(final_state)
    if report_id:
        final_state["report_id"] = report_id

    print("\n✅ Session complete.")  # let the operator know the graph finished
    trend_value = str(final_state.get("patient_trend") or "").strip().lower()
    if trend_value == "improving":
        trend_message = "Improving trend detected across recent sessions."
    elif trend_value == "needs work":
        trend_message = "Needs-work trend detected; consider easier prompts and more repetition."
    else:
        trend_message = "Trend unavailable (insufficient history)."

    print(f"[session] Trend summary: {trend_message}")

    history = final_state.get("session_history") or []
    if history:
        total_targets = len(history)
        avg_accuracy = sum(float(h.get("accuracy", 0) or 0) for h in history) / max(total_targets, 1)
        targets = [str(h.get("target_word", "")).strip() for h in history if str(h.get("target_word", "")).strip()]

        print("\n" + "═" * 55)
        print("  SESSION OVERALL SUMMARY")
        print("═" * 55)
        if targets:
            print(f"  Targets practiced    : {', '.join(targets)}")
        print(f"  Items practiced      : {total_targets}")
        print(f"  Average accuracy     : {avg_accuracy:.2f}%")
        print(f"  Trend                : {trend_value or 'unknown'}")
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
    return final_state  # hand the final state back to the caller (for tests / further inspection)


if __name__ == "__main__":
    run_session()  # execute the session when this script is run directly