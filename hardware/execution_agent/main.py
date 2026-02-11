
"""
main.py — Execution Agent Entry Point (Raspberry Pi 4)

This is the main entry point for the Execution Agent running on Raspberry Pi 4.
It serves as the application's bootstrap and orchestration layer, responsible for:

- Initializing the application: Loading and validating configuration from `.env` and
  `config.json` via the Settings module, ensuring the agent starts with valid parameters.
- Setting up infrastructure: Configuring logging (loguru) for both console output and
  file rotation, providing visibility into the agent's operation.
- Lifecycle management: Handling graceful shutdown on SIGINT/SIGTERM signals, ensuring
  clean termination when the system needs to stop the agent.
- Main execution loop: Orchestrating the agent's primary polling cycle that will
  coordinate communication with the backend server and manage hardware drivers.

The main.py file centralizes the application's startup sequence and provides a single
entry point that can be executed directly or imported as a module, following Python
best practices for application structure.
"""


from __future__ import annotations

import signal
import sys
import time
from pathlib import Path

from loguru import logger

from src.settings import Settings, load_settings_or_exit


PROJECT_ROOT = Path(__file__).resolve().parent
_RUNNING = True


def _configure_logging(settings: Settings) -> None:
    """Configure loguru for console + optional file logging."""

    logger.remove()  # remove default handler
    logger.add(sys.stdout, level=settings.log_level)

    # Optional log file under project root; safe on both Pi and laptop.
    log_file = PROJECT_ROOT / "execution_agent.log"
    logger.add(
        log_file,
        rotation="1 week",
        retention="4 weeks",
        enqueue=True,
        level=settings.log_level,
    )


def _signal_handler(signum, frame) -> None:  # type: ignore[override]
    global _RUNNING
    logger.info("Received signal %s, initiating shutdown...", signum)
    _RUNNING = False


def main() -> None:
    """Process entry point used on the Raspberry Pi."""

    settings = load_settings_or_exit()
    _configure_logging(settings)

    logger.info("Execution Agent starting…")
    logger.info("Device ID: {}", settings.device_id)
    logger.info("Server URL: {}", settings.server_url)
    logger.info("Log level: {}", settings.log_level)
    logger.info("Polling interval: {} s", settings.polling.interval_seconds)

    # Print configuration summary
    logger.info("Configuration loaded successfully:")
    logger.info("  - Audio: {} Hz, {} channels, volume={}", 
                settings.audio.sample_rate, 
                settings.audio.channels, 
                settings.audio.volume)
    logger.info("  - GPIO: pan_pin={}, tilt_pin={}", 
                settings.gpio.servo_pan_pin, 
                settings.gpio.servo_tilt_pin)
    logger.info("  - OLED: I2C port={}, address={}, size={}x{}", 
                settings.oled.i2c_port, 
                settings.oled.i2c_address, 
                settings.oled.width, 
                settings.oled.height)
    logger.info("  - Display: {}x{}, fullscreen={}", 
                settings.display.width, 
                settings.display.height, 
                settings.display.fullscreen)

    # Install signal handlers for clean shutdown.
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    logger.info("Entering idle loop with interval={} s (placeholder for Phase 2 polling)…", 
                settings.polling.interval_seconds)

    try:
        while _RUNNING:
            time.sleep(settings.polling.interval_seconds)
    finally:
        logger.info("Execution Agent stopped.")


if __name__ == "__main__":
    main()
