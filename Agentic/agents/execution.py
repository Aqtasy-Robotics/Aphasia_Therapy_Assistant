from typing import Any, Dict

import pyttsx3

from config import config


_tts_engine = None


def _get_tts_engine():
    global _tts_engine
    if _tts_engine is None:
        engine = pyttsx3.init()
        engine.setProperty("rate", config.tts_rate)
        engine.setProperty("volume", config.tts_volume)
        if config.tts_voice_name:
            for v in engine.getProperty("voices"):
                if config.tts_voice_name.lower() in v.name.lower():
                    engine.setProperty("voice", v.id)
                    break
        _tts_engine = engine
    return _tts_engine


def speak_text(text: str) -> None:
    try:
        engine = _get_tts_engine()
        engine.say(text)
        engine.runAndWait()
    except Exception:
        # Fail silently for TTS; console output will still be visible.
        pass


def run_execution(
    feedback_text: str,
    audio_metadata: Dict[str, Any] | None = None,
    perception_error: str | None = None,
) -> Dict[str, Any]:
    """
    Deliver feedback via console and TTS.
    """
    prefix_msgs = []
    if perception_error:
        prefix_msgs.append(
            "I had some trouble capturing your speech. Let's try again and make sure your microphone is working."
        )

    if audio_metadata and audio_metadata.get("too_noisy"):
        prefix_msgs.append("There was a lot of background noise. If you can, move to a quieter place.")

    full_message = ""
    if prefix_msgs:
        full_message = " ".join(prefix_msgs) + " " + feedback_text
    else:
        full_message = feedback_text

    # Console output
    print(f"Robot: {full_message}")

    # TTS
    speak_text(full_message)

    return {"delivered_feedback": full_message}

