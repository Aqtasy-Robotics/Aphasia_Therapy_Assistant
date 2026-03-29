"""Ear driver — microphone recording.

This module implements audio recording from the microphone using sounddevice,
converts the audio to WAV format, and uploads it via ApiClient.
"""

from __future__ import annotations

import asyncio
import io
import os
from typing import Any, Dict, Optional

import numpy as np
from loguru import logger
from scipy.io import wavfile

from src.communication.api_client import ApiClient
from src.services.audio_utils import SOUNDDEVICE_AVAILABLE, select_input_device

# Try to import sounddevice
try:
    import sounddevice as sd

    SD_AVAILABLE = SOUNDDEVICE_AVAILABLE
except ImportError:
    SD_AVAILABLE = False
    logger.warning("sounddevice not available - audio recording will be mocked")

# Module-level cache for input device
_input_device: Optional[int] = None
_settings: Optional[Any] = None

# Default substring for robot USB mics; override with config audio.input_device or PI_INPUT_DEVICE
_DEFAULT_USB_SPEC = "usb"


def _record_audio(
    duration_s: float,
    sample_rate: int,
    channels: int,
    device: int,
) -> tuple[np.ndarray, int]:
    """
    Record audio from the microphone.

    Returns (recording, actual_sample_rate). Retries at the device's default
    sample rate if PortAudio rejects the requested rate (typical for USB mics at 16 kHz).
    """
    if not SD_AVAILABLE:
        raise RuntimeError("sounddevice not available")

    dev = sd.query_devices(device)
    fallback_sr = int(float(dev.get("default_samplerate") or 44100))

    def _run(sr: int) -> np.ndarray:
        num_samples = int(duration_s * sr)
        recording = sd.rec(
            frames=num_samples,
            samplerate=sr,
            channels=channels,
            device=device,
            dtype=np.float32,
        )
        sd.wait()
        return recording

    try:
        logger.info("Recording audio: {}s at {} Hz, {} channels, device={}", duration_s, sample_rate, channels, device)
        recording = _run(sample_rate)
        logger.info("Recording completed: {} samples captured", len(recording))
        return recording, sample_rate
    except Exception as exc:
        err = str(exc).lower()
        if sample_rate != fallback_sr and (
            "sample rate" in err or "invalid" in err or "painvalidsample" in err.replace(" ", "")
        ):
            logger.warning(
                "Recording at {} Hz failed ({}); retrying at {} Hz",
                sample_rate,
                exc,
                fallback_sr,
            )
            recording = _run(fallback_sr)
            logger.info("Recording completed: {} samples at {} Hz", len(recording), fallback_sr)
            return recording, fallback_sr
        logger.error("Failed to record audio: {}", exc)
        raise RuntimeError(f"Audio recording failed: {exc}") from exc


def _numpy_to_wav_bytes(audio_array: np.ndarray, sample_rate: int) -> bytes:
    """
    Convert numpy audio array to WAV file bytes.

    Args:
        audio_array: Float32 numpy array (shape: [samples] or [samples, channels]).
        sample_rate: Sample rate in Hz.

    Returns:
        Bytes of WAV file.
    """
    try:
        # Ensure mono (take first channel if stereo)
        if len(audio_array.shape) > 1:
            audio_array = audio_array[:, 0] if audio_array.shape[1] > 0 else audio_array[:, 0]

        # Normalize to [-1, 1] range if needed
        audio_array = np.clip(audio_array, -1.0, 1.0)

        # Convert float32 to int16
        audio_int16 = (audio_array * 32767.0).astype(np.int16)

        # Write to BytesIO buffer
        buffer = io.BytesIO()
        wavfile.write(buffer, sample_rate, audio_int16)
        wav_bytes = buffer.getvalue()
        buffer.close()

        logger.debug("Converted audio to WAV: {} bytes, {} samples", len(wav_bytes), len(audio_int16))
        return wav_bytes
    except Exception as exc:
        logger.error("Failed to convert audio to WAV: {}", exc)
        raise RuntimeError(f"WAV conversion failed: {exc}") from exc


async def listen(
    payload: Dict[str, Any],
    api_client: ApiClient | None = None,
    settings: Any | None = None,
) -> Dict[str, Any]:
    """Record audio from the microphone.

    Expected payload (from backend command):
        {
            "duration_s": 5,
            "prompt": "Say 'apple'"   # optional, for logging/UI only
        }

    Args:
        payload: Command payload with duration_s and optional prompt.
        api_client: ApiClient instance for uploading recorded audio.
        settings: Settings instance for audio configuration (optional, for device selection).

    Returns:
        Result dict with status, duration, and upload success.
    """
    global _input_device, _settings

    duration_s = payload.get("duration_s", 5)
    prompt = payload.get("prompt")

    logger.info("[EAR] listen: duration_s={}, prompt={!r}", duration_s, prompt)

    # Hardware mocking fallback
    if not SD_AVAILABLE:
        logger.warning("Hardware not available - returning mock response")
        return {
            "driver": "ear",
            "action": "listen",
            "duration_s": duration_s,
            "prompt": prompt,
            "status": "ok_mock",
            "message": "Hardware not available - audio not recorded",
        }

    if api_client is None:
        logger.error("api_client not provided - cannot upload audio")
        return {
            "driver": "ear",
            "action": "listen",
            "duration_s": duration_s,
            "status": "error",
            "error_message": "api_client not provided",
        }

    if settings is None:
        # Try to use default settings if available
        logger.warning("settings not provided - using default audio config")
        sample_rate = 22050
        channels = 1
        device = None  # Will be resolved below
    else:
        sample_rate = settings.audio.sample_rate
        channels = settings.audio.channels

    def _mic_spec() -> str | None:
        env = (os.getenv("PI_INPUT_DEVICE") or "").strip()
        if env:
            if env.lower() in ("default", "system", "auto"):
                return None
            return env
        if settings is not None:
            raw = getattr(settings.audio, "input_device", None)
            if raw is not None and str(raw).strip():
                s = str(raw).strip()
                if s.lower() in ("default", "system", "auto"):
                    return None
                return s
        return _DEFAULT_USB_SPEC

    if _input_device is None or _settings is not settings:
        spec = _mic_spec()
        try:
            logger.info("Selecting input microphone (spec: {!r})", spec)
            _input_device = select_input_device(spec)
            _settings = settings
        except Exception as exc:
            logger.error("Failed to select input device: {}", exc)
            return {
                "driver": "ear",
                "action": "listen",
                "duration_s": duration_s,
                "status": "error",
                "error_message": f"Input device selection failed: {exc}",
            }

    device = _input_device

    try:
        # Record audio in thread to avoid blocking
        def _record() -> tuple[np.ndarray, int]:
            return _record_audio(duration_s, sample_rate, channels, device)

        audio_array, used_sr = await asyncio.to_thread(_record)

        # Convert to WAV bytes (use actual capture rate after fallback)
        wav_bytes = _numpy_to_wav_bytes(audio_array, used_sr)

        # Upload via api_client
        upload_success = await api_client.send_audio(wav_bytes)

        if upload_success:
            logger.info("Audio recorded and uploaded successfully: {} bytes", len(wav_bytes))
            out: Dict[str, Any] = {
                "driver": "ear",
                "action": "listen",
                "duration_s": duration_s,
                "prompt": prompt,
                "status": "ok",
                "audio_size_bytes": len(wav_bytes),
                "upload_success": True,
            }
            if payload.get("patient_id"):
                out["patient_id"] = str(payload["patient_id"])
            return out
        else:
            logger.error("Audio recorded but upload failed")
            return {
                "driver": "ear",
                "action": "listen",
                "duration_s": duration_s,
                "prompt": prompt,
                "status": "error",
                "error_message": "Audio upload failed",
                "audio_size_bytes": len(wav_bytes),
                "upload_success": False,
            }
    except Exception as exc:
        logger.exception("Error in listen(): {}", exc)
        return {
            "driver": "ear",
            "action": "listen",
            "duration_s": duration_s,
            "prompt": prompt,
            "status": "error",
            "error_message": str(exc),
        }


__all__ = ["listen"]