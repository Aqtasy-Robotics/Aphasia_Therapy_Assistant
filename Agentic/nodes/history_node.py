from Agentic.state import SpeechTherapyState

def history_node(state: SpeechTherapyState) -> dict:
    history = state.get("session_history", [])