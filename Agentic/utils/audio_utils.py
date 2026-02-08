import os
import sys
import tempfile
import time
from typing import Dict, Any, Tuple

import librosa
import numpy as np
import sounddevice as sd
import soundfile as sf

from config import config

def signal_recording_started():
    print("\n"+"="*50)
    print("🔴 RECORDING STARTED - Please speak now!")
    print("="*50 + "\n")


def record_audio_once() -> Tuple[str, Dict[str, Any]]:
    """
    Record a single utterance from the default microphone and return
    the path to a temporary WAV file plus basic audio metadata.
    Plays a beep before recording starts.
    """
    duration = config.record_seconds
    sample_rate = config.sample_rate

    # Play beep to signal user to start speaking
    play_beep()
    time.sleep(0.1)  # Small delay after beep

    recording = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32",
    )
    sd.wait()

    # Flatten to 1D
    audio = recording.squeeze()

    # Save to temporary WAV file
    fd, path = tempfile.mkstemp(suffix=".wav", prefix="speech_attempt_")
    os.close(fd)  # will be re-opened by soundfile/librosa
    sf.write(path, audio, sample_rate)

    # Compute simple audio stats
    y, sr = librosa.load(path, sr=sample_rate)
    rms = float(np.mean(librosa.feature.rms(y=y)))
    duration_sec = float(librosa.get_duration(y=y, sr=sr))

    too_noisy = rms < config.noise_rms_threshold or duration_sec < config.min_duration_seconds

    metadata: Dict[str, Any] = {
        "path": path,
        "sample_rate": sample_rate,
        "duration_seconds": duration_sec,
        "rms": rms,
        "too_noisy": too_noisy,
    }
    return path, metadata


def record_with_retries(max_retries: int | None = None) -> Tuple[str | None, Dict[str, Any]]:
    """
    Try recording up to max_retries times if audio is too noisy/too short.
    Returns (path, metadata). If completely failing, path is None and
    metadata contains an error field.
    """
    if max_retries is None:
        max_retries = config.max_record_retries

    last_metadata: Dict[str, Any] = {}
    for attempt in range(1, max_retries + 1):
        try:
            path, metadata = record_audio_once()
        except Exception as exc:  # microphone / driver errors
            return None, {
                "error": f"recording_failed: {exc}",
                "attempts": attempt,
            }

        last_metadata = metadata
        if not metadata.get("too_noisy", False):
            return path, metadata

    # If we exhausted retries, return last metadata with a flag
    last_metadata["error"] = "too_noisy_after_retries"
    return last_metadata.get("path"), last_metadata

