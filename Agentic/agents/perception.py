from typing import Any, Dict

import whisper

from config import config
from utils.audio_utils import record_with_retries
from utils.phoneme_utils import text_to_phonemes


# Load Whisper model once (at startup, not per request)
_whisper_model = None

def get_whisper_model():
    """Load and cache the Whisper model"""
    global _whisper_model
    if _whisper_model is None:
        model_name = config.whisper_model or "base"  # "tiny", "base", "small", "medium", "large"
        print(f"Loading Whisper {model_name} model...")
        _whisper_model = whisper.load_model(model_name)
    return _whisper_model


def transcribe_audio(audio_path: str, language: str | None = None) -> str:
    """
    Use local Whisper to transcribe the given audio file.
    """
    if language is None:
        language = config.language

    model = get_whisper_model()
    
    result = model.transcribe(
        audio_path,
        language=language,
        fp16=False  # Set to True if you have GPU (faster)
    )

    return result["text"]


def run_perception(target_word: str, session_id: str) -> Dict[str, Any]:
    """
    Capture audio, transcribe it, and extract phonemes.
    Returns a dict suitable to merge into the LangGraph state.
    """
    audio_path, audio_metadata = record_with_retries()

    if audio_path is None:
        # Completely failed to record
        return {
            "target_word": target_word,
            "session_id": session_id,
            "transcribed_text": "",
            "phonemes_transcribed": [],
            "audio_metadata": audio_metadata,
            "perception_error": audio_metadata.get("error", "unknown_recording_error issue with the recording "),
        }

    try:
        transcribed_text = transcribe_audio(audio_path, language=config.language)
    except Exception as exc:
        return {
            "target_word": target_word,
            "session_id": session_id,
            "transcribed_text": "",
            "phonemes_transcribed": [],
            "audio_metadata": {**audio_metadata, "error": f"whisper_failed: {exc}"},
            "perception_error": "whisper_failed",
        }

    # Extract phonemes from the transcription
    phonemes_transcribed = text_to_phonemes(transcribed_text)

    return {
        "target_word": target_word,
        "session_id": session_id,
        "transcribed_text": transcribed_text,
        "phonemes_transcribed": phonemes_transcribed,
        "audio_metadata": audio_metadata,
    }