"""Main entry point for the Aphasia Therapy Robot Execution Agent."""

import asyncio
import os
import signal
import sys
from pathlib import Path

from loguru import logger

from src.communication.api_client import ApiClient
from src.communication.models import ActionEnum
from src.dispatcher import (
    Dispatcher,
    mock_listen,
    mock_move_head,
    mock_show_face,
    mock_show_ui,
    mock_speak,
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
    logger.debug(f"GPIO pins - Pan: {settings.gpio.servo_pan_pin}, "
                f"Tilt: {settings.gpio.servo_tilt_pin}")
    logger.debug(f"OLED: {settings.oled.width}x{settings.oled.height} "
                f"at {settings.oled.i2c_address}")

# Initialise API client and dispatcher
    api_client = ApiClient(settings)
    dispatcher = Dispatcher(settings)

    # Register mock drivers for all actions (real drivers arrive in Phases 3–5)
    dispatcher.register_driver(ActionEnum.SPEAK, mock_speak)
    dispatcher.register_driver(ActionEnum.LISTEN, mock_listen)
    dispatcher.register_driver(ActionEnum.SHOW_FACE, mock_show_face)
    dispatcher.register_driver(ActionEnum.MOVE_HEAD, mock_move_head)
    dispatcher.register_driver(ActionEnum.SHOW_UI, mock_show_ui)

    # Health check at startup
    await api_client.health_check()

    logger.info("Entering polling loop (Phase 2)...")

    try:
        while running:
            try:
                cmd = await api_client.poll_command()
                if cmd:
                    logger.info(
                        "Received command: action={} id={}",
                        cmd.action.value,
                        cmd.command_id,
                    )
                    ack = await dispatcher.execute(cmd)
                    await api_client.send_ack(ack)

                await asyncio.sleep(settings.polling.interval_seconds)
            except Exception as e:  # noqa: BLE001
                logger.exception("Error in polling loop: {}", e)
                await asyncio.sleep(settings.polling.interval_seconds)
    finally:
        # Ensure HTTP client is closed on shutdown
        await api_client.aclose()
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
