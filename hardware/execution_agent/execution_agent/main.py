"""Main entry point for the Aphasia Therapy Robot Execution Agent."""

import asyncio
import os
import signal
import sys
from pathlib import Path

from loguru import logger

from src.communication.api_client import ApiClient
from src.communication.models import ActionEnum
from src.dispatcher import Dispatcher
from src.services.audio_utils import list_audio_devices
from src.services.ear import listen
from src.services.face import (
    maybe_start_standalone_face,
    show_face,
    shutdown_face,
    stop_standalone_face,
)
from src.services.head import move_head, shutdown_head
from src.services.mouth import speak
from src.ui.body_app import (
    dequeue_ui_events,
    has_pending_ui_events,
    maybe_start_ui_from_env,
    show_ui,
)
from src.settings import load_settings_or_exit

# Global state
running = True


def handle_shutdown(signum, frame):
    """Handle shutdown signals gracefully."""
    global running
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    running = False


def setup_logging(log_level: str, project_root: Path):
    """
    Configure loguru logger with console and file sinks.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        project_root: Root directory of the project
    """
    # Remove default logger
    logger.remove()

    # Console sink with color and formatting
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level=log_level,
        colorize=True,
    )

    # File sink - try /var/log first, fallback to logs/ directory
    log_file = Path("/var/log/execution_agent.log")
    if not log_file.parent.exists() or not os.access(log_file.parent, os.W_OK):
        # Fallback to project logs directory
        logs_dir = project_root / "logs"
        logs_dir.mkdir(exist_ok=True)
        log_file = logs_dir / "execution_agent.log"

    logger.add(
        log_file,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
        level=log_level,
        rotation="10 MB",
        retention="5",
        compression="zip",
    )


async def main():
    """Main async entry point."""
    global running

    # Get project root (directory containing main.py)
    project_root = Path(__file__).parent

    # Load settings (exits on error)
    logger.info("Loading configuration...")
    settings = load_settings_or_exit()

    # Setup logging with loaded log level
    setup_logging(settings.log_level, project_root)
    maybe_start_ui_from_env(project_root)

    # Print startup banner
    banner = f"""
╔════════════════════════════════════════╗
║   Aphasia Therapy Robot - Agent v1    ║
╚════════════════════════════════════════╝
Device ID: {settings.device_id}
Server URL: {settings.server_url}
Polling Interval: {settings.polling.interval_seconds}s
Log Level: {settings.log_level}
"""
    logger.info(banner)

    # Log configuration summary
    logger.info("Configuration loaded successfully")
    logger.debug(f"Audio sample rate: {settings.audio.sample_rate} Hz")
    logger.debug(f"GPIO pin - Pan: {settings.gpio.servo_pan_pin}")
    logger.debug(f"OLED: {settings.oled.width}x{settings.oled.height} "
                f"at {settings.oled.i2c_address}")
    logger.debug(
        "OLED interface={} driver={} rotate={} eye_layout={} eyes_bias_x={} standalone_math_eyes={}",
        settings.oled.interface,
        settings.oled.oled_driver,
        settings.oled.rotate,
        settings.oled.eye_layout,
        settings.oled.eyes_bias_x,
        settings.oled.standalone_math_eyes,
    )

    # List audio devices and log selected devices
    logger.info("Audio configuration:")
    logger.info(f"  Sample rate: {settings.audio.sample_rate} Hz")
    logger.info(f"  Channels: {settings.audio.channels}")
    logger.info(f"  Volume: {settings.audio.volume}")
    logger.info(f"  Input device: {settings.audio.input_device or 'default'}")
    logger.info(f"  Output device: {settings.audio.output_device or 'default'}")
    list_audio_devices()

    maybe_start_standalone_face(settings)

    api_client = None
    dispatcher = None

    if settings.polling.enabled:
        # Initialise API client and dispatcher
        api_client = ApiClient(settings)
        dispatcher = Dispatcher(settings, api_client=api_client)

        # Register real driver entry-points (hardware-backed implementations will be
        # added in Phases 3–5; current versions are safe stubs in their own modules).
        # Note: speak() and listen() will receive additional args (settings/api_client) from dispatcher
        dispatcher.register_driver(ActionEnum.SPEAK, speak)
        dispatcher.register_driver(ActionEnum.LISTEN, listen)
        dispatcher.register_driver(ActionEnum.SHOW_FACE, show_face)
        dispatcher.register_driver(ActionEnum.MOVE_HEAD, move_head)
        dispatcher.register_driver(ActionEnum.SHOW_UI, show_ui)

        # Health check at startup
        await api_client.health_check()
        logger.info("Entering backend polling loop...")
    else:
        logger.info("Polling disabled: running in local standalone mode")

    # When polling is off, still wake the loop quickly for UI event logging / local use.
    loop_sleep_sec = (
        settings.polling.interval_seconds
        if settings.polling.enabled
        else min(settings.polling.interval_seconds, 0.25)
    )

    try:
        while running:
            try:
                if settings.polling.enabled and api_client is not None and dispatcher is not None:
                    cmd = await api_client.poll_command()
                    if cmd:
                        logger.info(
                            "Received command: action={} id={}",
                            cmd.action.value,
                            cmd.command_id,
                        )
                        ack = await dispatcher.execute(cmd)
                        await api_client.send_ack(ack)

                # Drain local UI events (queue may hold more than one batch).
                while True:
                    batch = dequeue_ui_events(max_items=64)
                    if not batch:
                        break
                    for ui_event in batch:
                        if api_client is not None:
                            posted = await api_client.post_ui_event(ui_event)
                            if not posted:
                                logger.info("UI event (not posted): {}", ui_event)
                        else:
                            logger.info("UI event: {}", ui_event)

                sleep_for = loop_sleep_sec
                if has_pending_ui_events():
                    sleep_for = min(sleep_for, 0.05)
                await asyncio.sleep(sleep_for)
            except Exception as e:  # noqa: BLE001
                logger.exception("Error in polling loop: {}", e)
                await asyncio.sleep(loop_sleep_sec)
    finally:
        # Stop OLED animator before releasing the device (avoid concurrent use).
        await stop_standalone_face()
        await asyncio.gather(
            shutdown_head(),
            shutdown_face(),
            *( [api_client.aclose()] if api_client is not None else [] ),
            return_exceptions=True,
        )
        logger.info("Shutdown complete")


if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)
