import os
from dataclasses import dataclass
from dotenv import load_dotenv, dotenv_values

# Load environment variables from .env file
load_dotenv()


@dataclass
class Config:
    # LLM / API configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")  # "openai" or "anthropic"
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o")

    # Whisper / speech settings
    whisper_model: str = os.getenv("WHISPER_MODEL", "base")  # placeholder; updated when using API
    language: str = os.getenv("LANGUAGE", "en")

    # Audio capture
    sample_rate: int = int(os.getenv("SAMPLE_RATE", "16000"))
    record_seconds: float = float(os.getenv("RECORD_SECONDS", "7.0"))
    max_record_retries: int = int(os.getenv("MAX_RECORD_RETRIES", "3"))

    # Noise / quality thresholds
    noise_rms_threshold: float = float(os.getenv("NOISE_RMS_THRESHOLD", "0.01"))
    min_duration_seconds: float = float(os.getenv("MIN_DURATION_SECONDS", "0.5"))

    # Matching / scoring
    match_success_threshold: float = float(os.getenv("MATCH_SUCCESS_THRESHOLD", "0.95"))

    # TTS
    tts_rate: int = int(os.getenv("TTS_RATE", "170"))
    tts_volume: float = float(os.getenv("TTS_VOLUME", "1.0"))
    tts_voice_name: str = os.getenv("TTS_VOICE_NAME", "")

    # Logging
    data_dir: str = os.getenv("DATA_DIR", "data")
    session_log_filename: str = os.getenv("SESSION_LOG_FILENAME", "session_logs.json")
    #  creating a list of target words for the session
    target_words: list = os.getenv("TARGET_WORDS", "boring,interesting,exciting, running , walking , sleeping ,writing ,studying,wating").split(",")

config = Config()


def get_session_log_path() -> str:
    os.makedirs(config.data_dir, exist_ok=True)
    return os.path.join(config.data_dir, config.session_log_filename)

