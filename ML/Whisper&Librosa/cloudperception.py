from typing import Any, Dict

from openai import OpenAI

from config import config
from utils.audio_utils import record_with_retries
from utils.phoneme_utils import text_to_phonemes


client = OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None


def transcribe_audio(audio_path: str, language: str | None = None) -> str:
    """
    Use OpenAI Whisper API to transcribe the given audio file.
    """
    if client is None:
        raise RuntimeError("OPENAI_API_KEY is not set; cannot call Whisper.")

    if language is None:
        language = config.language

    with open(audio_path, "rb") as f:
        # Using whisper-1 transcription model
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=language,
        )

    # The client returns an object with a 'text' field
    return transcript.text  # type: ignore[attr-defined]


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

