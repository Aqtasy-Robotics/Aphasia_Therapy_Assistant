"""Audio utilities for device selection and listing.

This module provides functions to query, list, and select audio input/output devices
using sounddevice, with support for device selection by index or name substring.
"""

from __future__ import annotations

from typing import Any, Optional

from loguru import logger

# `sounddevice` is an optional runtime dependency; it may not be installed in all
# development environments, so we ignore static import errors here.
try:
    import sounddevice as sd  # type: ignore[import-not-found]
    SOUNDDEVICE_AVAILABLE = True
except Exception:  # noqa: BLE001
    SOUNDDEVICE_AVAILABLE = False
    sd = None  # type: ignore[assignment]
    logger.warning("sounddevice not available - audio functionality will be mocked")


def list_audio_devices() -> None:
    """
    Query and log all available audio devices.

    This function lists all input and output devices with their indices and names,
    which is useful for debugging and configuration.
    """
    if not SOUNDDEVICE_AVAILABLE:
        logger.warning("Cannot list audio devices: sounddevice not available")
        return

    try:
        devices = sd.query_devices()
        logger.info("Available audio devices:")
        logger.info("=" * 80)
        for i, device in enumerate(devices):
            device_type = []
            if device["max_input_channels"] > 0:
                device_type.append("INPUT")
            if device["max_output_channels"] > 0:
                device_type.append("OUTPUT")
            device_type_str = "/".join(device_type) if device_type else "N/A"
            logger.info(
                "  [{:2d}] {} ({} channels, {} Hz) - {}",
                i,
                device["name"],
                device_type_str,
                int(device["default_samplerate"]),
                device["hostapi"],
            )
        logger.info("=" * 80)
        default_input = sd.query_devices(kind="input")
        default_output = sd.query_devices(kind="output")
        logger.info("Default input device: [{}] {}", default_input["index"], default_input["name"])
        logger.info("Default output device: [{}] {}", default_output["index"], default_output["name"])
    except Exception as exc:
        logger.error("Failed to query audio devices: {}", exc)


def select_input_device(device_spec: Optional[str]) -> int:
    """
    Select an input audio device by index or name substring.

    Args:
        device_spec: Device specification - either a numeric string (device index)
                     or a substring to match against device names (case-insensitive).
                     If None, returns the default input device index.

    Returns:
        Device index for use with sounddevice functions.

    Raises:
        RuntimeError: If sounddevice is not available or device selection fails.
    """
    if not SOUNDDEVICE_AVAILABLE:
        raise RuntimeError("sounddevice not available - cannot select input device")

    if device_spec is None:
        default_device = sd.query_devices(kind="input")
        logger.debug("Using default input device: [{}] {}", default_device["index"], default_device["name"])
        return default_device["index"]

    # Try to parse as numeric index first
    try:
        device_index = int(device_spec)
        devices = sd.query_devices()
        if 0 <= device_index < len(devices):
            device = devices[device_index]
            if device["max_input_channels"] > 0:
                logger.info("Selected input device by index: [{}] {}", device_index, device["name"])
                return device_index
            raise ValueError(f"Device [{device_index}] is not an input device")
        raise ValueError(f"Device index {device_index} out of range (0-{len(devices)-1})")
    except ValueError:
        # Not a number, try name substring matching
        pass

    # Search by name substring (case-insensitive)
    devices = sd.query_devices()
    matching_devices = []
    for i, device in enumerate(devices):
        if device["max_input_channels"] > 0 and device_spec.lower() in device["name"].lower():
            matching_devices.append((i, device))

    if not matching_devices:
        logger.warning(
            "No input device found matching '{}', using default device",
            device_spec,
        )
        default_device = sd.query_devices(kind="input")
        return default_device["index"]

    if len(matching_devices) > 1:
        logger.warning(
            "Multiple input devices match '{}': {}",
            device_spec,
            [f"[{idx}] {dev['name']}" for idx, dev in matching_devices],
        )

    device_index, device = matching_devices[0]
    logger.info("Selected input device by name: [{}] {}", device_index, device["name"])
    return device_index


def select_output_device(device_spec: Optional[str]) -> int:
    """
    Select an output audio device by index or name substring.

    Args:
        device_spec: Device specification - either a numeric string (device index)
                     or a substring to match against device names (case-insensitive).
                     If None, returns the default output device index.

    Returns:
        Device index for use with sounddevice functions.

    Raises:
        RuntimeError: If sounddevice is not available or device selection fails.
    """
    if not SOUNDDEVICE_AVAILABLE:
        raise RuntimeError("sounddevice not available - cannot select output device")

    if device_spec is None:
        default_device = sd.query_devices(kind="output")
        logger.debug("Using default output device: [{}] {}", default_device["index"], default_device["name"])
        return default_device["index"]

    # Try to parse as numeric index first
    try:
        device_index = int(device_spec)
        devices = sd.query_devices()
        if 0 <= device_index < len(devices):
            device = devices[device_index]
            if device["max_output_channels"] > 0:
                logger.info("Selected output device by index: [{}] {}", device_index, device["name"])
                return device_index
            raise ValueError(f"Device [{device_index}] is not an output device")
        raise ValueError(f"Device index {device_index} out of range (0-{len(devices)-1})")
    except ValueError:
        # Not a number, try name substring matching
        pass

    # Search by name substring (case-insensitive)
    devices = sd.query_devices()
    matching_devices = []
    for i, device in enumerate(devices):
        if device["max_output_channels"] > 0 and device_spec.lower() in device["name"].lower():
            matching_devices.append((i, device))

    if not matching_devices:
        logger.warning(
            "No output device found matching '{}', using default device",
            device_spec,
        )
        default_device = sd.query_devices(kind="output")
        return default_device["index"]

    if len(matching_devices) > 1:
        logger.warning(
            "Multiple output devices match '{}': {}",
            device_spec,
            [f"[{idx}] {dev['name']}" for idx, dev in matching_devices],
        )

    device_index, device = matching_devices[0]
    logger.info("Selected output device by name: [{}] {}", device_index, device["name"])
    return device_index


__all__ = ["list_audio_devices", "select_input_device", "select_output_device", "SOUNDDEVICE_AVAILABLE"]
