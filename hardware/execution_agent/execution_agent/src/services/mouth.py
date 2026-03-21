"""Mouth driver — Piper TTS + speaker output.

This module implements text-to-speech synthesis using Piper TTS (ONNX) and
plays audio through the configured output device using sounddevice.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
from loguru import logger

from src.services.audio_utils import SOUNDDEVICE_AVAILABLE, select_output_device

# Try to import piper-tts and sounddevice
try:
    # The piper-tts package provides PiperVoice class
    # Try standard import first
    try:
        from piper import PiperVoice
        PIPER_AVAILABLE = True
    except ImportError:
        # Try alternative import path
        try:
            from piper_tts import PiperVoice
            PIPER_AVAILABLE = True
        except ImportError:
            PIPER_AVAILABLE = False
            logger.warning("piper-tts package not available - TTS will be mocked")
except Exception as exc:
    PIPER_AVAILABLE = False
    logger.warning("Failed to import piper-tts: {} - TTS will be mocked", exc)

try:
    import sounddevice as sd

    SD_AVAILABLE = SOUNDDEVICE_AVAILABLE
except ImportError:
    SD_AVAILABLE = False
    logger.warning("sounddevice not available - audio playback will be mocked")

# Module-level cache for loaded Piper model
_piper_voice: Optional[Any] = None
_settings: Optional[Any] = None
_output_device: Optional[int] = None


def _load_piper_model(settings: Any) -> Any:
    """
    Load Piper TTS model (lazy initialization, cached).

    Args:
        settings: Settings instance with piper_model_path.

    Returns:
        PiperVoice instance.

    Raises:
        RuntimeError: If piper-tts is not available or model loading fails.
    """
    global _piper_voice, _settings

    if not PIPER_AVAILABLE:
        raise RuntimeError("piper-tts package not available")

    # Return cached model if already loaded with same settings
    if _piper_voice is not None and _settings is settings:
        return _piper_voice

    model_path = Path(settings.piper_model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Piper model not found at {model_path}")

    logger.info("Loading Piper TTS model from {}", model_path)
    try:
        # PiperVoice.from_config expects the .onnx.json config file
        config_path = model_path.with_suffix(".onnx.json")
        if not config_path.exists():
            raise FileNotFoundError(f"Piper config not found at {config_path}")

        _piper_voice = PiperVoice.load(str(model_path), config_path=str(config_path))
        _settings = settings
        logger.info("Piper TTS model loaded successfully")
        return _piper_voice
    except Exception as exc:
        logger.error("Failed to load Piper model: {}", exc)
        raise RuntimeError(f"Failed to load Piper model: {exc}") from exc


def _synthesize_speech(text: str, voice: Any) -> np.ndarray:
    """
    Synthesize text to speech using Piper TTS.

    Args:
        text: Text to synthesize.
        voice: PiperVoice instance.

    Returns:
        Mono float32 numpy array at configured sample rate (22050 Hz).
    """
    if not PIPER_AVAILABLE:
        raise RuntimeError("piper-tts not available")

    try:
        # PiperVoice.synthesize returns a generator of audio chunks
        # We need to collect all chunks into a single array
        audio_chunks = []
        for audio_bytes in voice.synthesize(text):
            # Convert bytes to numpy array (int16, then normalize to float32)
            audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0
            audio_chunks.append(audio_float32)

        if not audio_chunks:
            raise ValueError("No audio generated from text")

        # Concatenate all chunks
        audio_array = np.concatenate(audio_chunks)

        # Ensure mono (flatten if stereo)
        if len(audio_array.shape) > 1:
            audio_array = np.mean(audio_array, axis=1)

        logger.debug("Synthesized {} samples of audio from text", len(audio_array))
        return audio_array
    except Exception as exc:
        logger.error("Failed to synthesize speech: {}", exc)
        raise RuntimeError(f"Speech synthesis failed: {exc}") from exc


def _play_audio(audio_array: np.ndarray, volume: float, sample_rate: int, device: int) -> None:
    """
    Play audio array through sounddevice with volume control.

    Args:
        audio_array: Mono float32 numpy array.
        volume: Volume gain (0.0 to 1.0).
        sample_rate: Sample rate in Hz.
        device: Output device index.
    """
    if not SD_AVAILABLE:
        raise RuntimeError("sounddevice not available")

    try:
        # Apply volume gain
        audio_with_volume = audio_array * volume

        # Ensure values are in valid range [-1, 1]
        audio_with_volume = np.clip(audio_with_volume, -1.0, 1.0)

        logger.debug("Playing audio: {} samples at {} Hz, volume={}, device={}", len(audio_with_volume), sample_rate, volume, device)

        # Play audio (blocking call)
        sd.play(audio_with_volume, samplerate=sample_rate, device=device)
        sd.wait()  # Wait until playback is finished

        logger.debug("Audio playback completed")
    except Exception as exc:
        logger.error("Failed to play audio: {}", exc)
        raise RuntimeError(f"Audio playback failed: {exc}") from exc


async def speak(payload: Dict[str, Any], settings: Any | None = None) -> Dict[str, Any]:
    """Speak the requested text using TTS.

    Expected payload (from backend command):
        {
            "text": "Hello, let's practice",
            "voice": "en_US-lessac-medium",   # optional (currently ignored, uses configured model)
            "volume": 0.8                     # optional override
        }

    Args:
        payload: Command payload with text, optional voice, and optional volume.
        settings: Settings instance for model path and audio config.

    Returns:
        Result dict with status and metadata.
    """
    global _output_device

    if settings is None:
        # Fallback for backward compatibility - return mock response
        logger.warning("speak() called without settings - returning mock response")
        text = payload.get("text") or payload.get("utterance") or ""
        return {
            "driver": "mouth",
            "action": "speak",
            "text": text,
            "status": "ok_mock",
            "message": "Settings not provided",
        }

    text = payload.get("text") or payload.get("utterance") or ""
    if not text:
        return {
            "driver": "mouth",
            "action": "speak",
            "status": "error",
            "error_message": "No text provided in payload",
        }

    voice = payload.get("voice", "default")  # Currently ignored, uses configured model
    volume_override = payload.get("volume")
    volume = volume_override if volume_override is not None else settings.audio.volume

    # Clamp volume to valid range
    volume = max(0.0, min(1.0, volume))

    logger.info("[MOUTH] speak: text={!r}, voice={}, volume={}", text, voice, volume)

    # Hardware mocking fallback
    if not PIPER_AVAILABLE or not SD_AVAILABLE:
        logger.warning("Hardware not available - returning mock response")
        return {
            "driver": "mouth",
            "action": "speak",
            "text": text,
            "voice": voice,
            "volume": volume,
            "status": "ok_mock",
            "message": "Hardware not available - audio not played",
        }

    try:
        # Initialize output device if not already done
        if _output_device is None:
            _output_device = select_output_device(settings.audio.output_device)

        # Load model (cached after first load)
        voice_model = _load_piper_model(settings)

        # Synthesize and play in thread pool to avoid blocking
        def _synthesize_and_play() -> None:
            audio_array = _synthesize_speech(text, voice_model)
            _play_audio(
                audio_array,
                volume,
                settings.audio.sample_rate,
                _output_device,
            )

        # Run in thread to avoid blocking polling loop
        await asyncio.to_thread(_synthesize_and_play)

        return {
            "driver": "mouth",
            "action": "speak",
            "text": text,
            "voice": voice,
            "volume": volume,
            "status": "ok",
        }
    except Exception as exc:
        logger.exception("Error in speak(): {}", exc)
        return {
            "driver": "mouth",
            "action": "speak",
            "text": text,
            "voice": voice,
            "volume": volume,
            "status": "error",
            "error_message": str(exc),
        }


__all__ = ["speak"]
