from Agentic.state import SpeechTherapyState

def history_node(state: SpeechTherapyState) -> dict:
    history = state.get("session_history", [])

    recent = history[-3:] if len(history) >= 3 else history
    trend = "improving" if _is_improving(recent) else "needs work"
    
    return {
        **state,
        "patient_trend": trend,            
        "sessions_done": len(history),
    }

