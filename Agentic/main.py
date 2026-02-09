from __future__ import annotations

import uuid
from typing import Any, Dict, TypedDict

from langgraph.graph import StateGraph, END

from agents.perception import run_perception
from agents.analyzer import run_analysis
from agents.reasoning import run_reasoning
from agents.execution import run_execution
from progress_logging.progress_logger import log_attempt, get_session_stats
from config import config


class SessionState(TypedDict, total=False):
    session_id: str
    target_word: str
    transcribed_text: str
    phonemes_transcribed: list[str]
    phonemes_target: list[str]
    audio_metadata: Dict[str, Any]
    error_report: Dict[str, Any]
    error_type: str
    is_perfect_match: bool
    feedback_text: str
    delivered_feedback: str
    perception_error: str


def perception_node(state: SessionState) -> SessionState:
    result = run_perception(state["target_word"], state["session_id"])
    new_state: SessionState = {**state, **result}
    return new_state


def analyzer_node(state: SessionState) -> SessionState:
    result = run_analysis(
        transcribed_text=state.get("transcribed_text", ""),
        target_word=state["target_word"],
        phonemes_transcribed=state.get("phonemes_transcribed", []),
    )
    new_state: SessionState = {**state, **result}
    return new_state


def reasoning_node(state: SessionState) -> SessionState:
    result = run_reasoning(
        target_word=state["target_word"],
        error_report=state.get("error_report", {}),
        semantic_report=state.get("semantic_report", {}),
        is_perfect_match=state.get("is_perfect_match", False),
    )
    new_state: SessionState = {**state, **result}
    return new_state


def execution_node(state: SessionState) -> SessionState:
    result = run_execution(
        feedback_text=state.get("feedback_text", "Let's try that word again."),
        audio_metadata=state.get("audio_metadata"),
        perception_error=state.get("perception_error"),
    )
    new_state: SessionState = {**state, **result}
    return new_state


def logger_node(state: SessionState) -> SessionState:
    error_report = state.get("error_report", {})
    match_score = float(error_report.get("match_score", 0.0))
    error_type = error_report.get("primary_error_type", "Unknown")

    log_attempt(
        session_id=state["session_id"],
        target_word=state["target_word"],
        user_attempt_text=state.get("transcribed_text", ""),
        error_type=error_type,
        match_score=match_score,
        raw_error_report=error_report,
    )
    return state


def build_app():
    graph = StateGraph(SessionState)

    graph.add_node("perception", perception_node)
    graph.add_node("analyzer", analyzer_node)
    graph.add_node("reasoning", reasoning_node)
    graph.add_node("execution", execution_node)
    graph.add_node("logger", logger_node)

    graph.set_entry_point("perception")
    graph.add_edge("perception", "analyzer")
    graph.add_edge("analyzer", "reasoning")
    graph.add_edge("reasoning", "execution")
    graph.add_edge("execution", "logger")
    graph.add_edge("logger", END)

    return graph.compile()


def run_session(target_words: list[str]) -> None:
    app = build_app()
    session_id = str(uuid.uuid4())
    print(f"Starting speech therapy session: {session_id}")
    print(f"Target words: {', '.join(target_words)}")

    for word in target_words:
        print("\n----------------------------------------")
        print(f"Next word: {word}")
        print("Please say the word clearly after the beep (simulated)...")

        initial_state: SessionState = {
            "session_id": session_id,
            "target_word": word,
        }
        final_state = app.invoke(initial_state)

        if final_state.get("is_perfect_match"):
            print(f"Result for '{word}': Success (match_score="
                  f"{final_state.get('error_report', {}).get('match_score', 0.0):.2f})")
        else:
            print(
                f"Result for '{word}': Attempted with errors "
                f"(type={final_state.get('error_type', 'Unknown')})"
            )

    stats = get_session_stats(session_id)
    print("\n===== Session Summary =====")
    print(f"Session ID: {stats['session_id']}")
    print(f"Total attempts: {stats['total_attempts']}")
    print(f"Successes: {stats['successes']}")
    print(f"Success rate: {stats['success_percentage']:.1f}%")



if __name__ == "__main__":
    # Example list of practice words; adjust as needed.
    practice_words = ["rabbit", "red", "flower"]
    run_session(practice_words)

