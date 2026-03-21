"""
settings.py — Central configuration for the execution agent (Raspberry Pi 4).

This module loads:
- Environment variables from `.env` (SERVER_URL, DEVICE_ID, PIPER_MODEL_PATH, LOG_LEVEL)
- Runtime configuration from `config.json` (polling, audio, GPIO, OLED, display)

It is designed to work both on the Raspberry Pi and on a dev machine.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional
import json

from pydantic import AnyHttpUrl, BaseModel, Field, ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class PollingConfig(BaseModel):
    """HTTP polling behaviour for the FastAPI backend."""

    enabled: bool = Field(
        default=True,
        description="Enable backend polling loop. Set false for fully local runtime.",
    )
    interval_seconds: float = Field(gt=0.0)
    timeout_seconds: float = Field(gt=0.0)
    max_retries: int = Field(ge=0)


class AudioConfig(BaseModel):
    """Microphone and speaker configuration."""

    sample_rate: int = Field(gt=0)
    channels: int = Field(ge=1, le=2, description="Number of audio channels (1=mono, 2=stereo)")
    volume: float = Field(ge=0.0, le=1.0)
    input_device: Optional[str] = None
    output_device: Optional[str] = None


class GPIOConfig(BaseModel):
    """GPIO configuration for pan servo control."""

    servo_pan_pin: int = Field(ge=0, le=27, description="BCM pin number for pan servo")
    servo_min_pulse_width: float = Field(gt=0.0)
    servo_max_pulse_width: float = Field(gt=0.0)


class OledConfig(BaseModel):
    """OLED display configuration (I2C or SPI)."""

    interface: str = Field(
        default="i2c",
        description="Display bus interface: i2c or spi",
    )
    oled_driver: str = Field(
        default="ssd1351",
        description="Controller driver name (e.g., ssd1351, ssd1331, sh1106, sh1107)",
    )
    i2c_port: int = Field(default=1, ge=0, description="I2C port number (typically 1 on Raspberry Pi)")
    i2c_address: str = Field(default="0x3C", description="I2C address of OLED display")
    spi_port: int = Field(default=0, ge=0, description="SPI port number (typically 0 on Raspberry Pi)")
    spi_device: int = Field(default=0, ge=0, description="SPI device/CS number (typically 0 or 1)")
    spi_gpio_dc: int = Field(default=24, ge=0, le=27, description="BCM pin for OLED D/C line")
    spi_gpio_rst: int = Field(default=25, ge=0, le=27, description="BCM pin for OLED RESET line")
    spi_bus_speed_hz: int = Field(default=8_000_000, ge=100_000, description="SPI bus speed in Hz")
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    rotate: int = Field(default=0, ge=0, le=3, description="Display rotation (0, 90, 180, 270 degrees)")
    standalone_math_eyes: bool = Field(
        default=False,
        description="Run continuous local math-generated eyes without backend commands.",
    )
    default_expression: str = Field(default="neutral")
    frame_delay_seconds: float = Field(
        default=0.05,
        gt=0.0,
        description="Frame delay for local eye animation loop.",
    )
    eye_layout: str = Field(
        default="horizontal",
        description="Eye pair layout: horizontal (side-by-side) or vertical (stacked).",
    )
    eyes_bias_x: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
        description="Shift both eyes horizontally in frame (-1=left, +1=right).",
    )

    @field_validator("i2c_address")
    @classmethod
    def validate_i2c_address(cls, v: str) -> str:
        """Validate I2C address format."""
        if not v.startswith("0x"):
            raise ValueError("I2C address must be in hexadecimal format (e.g., 0x3C)")
        try:
            int(v, 16)
        except ValueError as exc:
            raise ValueError(f"Invalid I2C address format: {v}") from exc
        return v

    @field_validator("interface")
    @classmethod
    def validate_interface(cls, v: str) -> str:
        normalized = v.lower().strip()
        if normalized not in {"i2c", "spi"}:
            raise ValueError("oled.interface must be 'i2c' or 'spi'")
        return normalized

    @field_validator("eye_layout")
    @classmethod
    def validate_eye_layout(cls, v: str) -> str:
        normalized = v.lower().strip()
        if normalized not in {"horizontal", "vertical"}:
            raise ValueError("oled.eye_layout must be 'horizontal' or 'vertical'")
        return normalized


class DisplayConfig(BaseModel):
    """7\" Kivy touch display configuration."""

    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fullscreen: bool = True


class Settings(BaseSettings):
    """
    Top-level settings object combining environment + JSON configuration.

    Environment (from `.env`):
    - SERVER_URL
    - DEVICE_ID
    - PIPER_MODEL_PATH
    - LOG_LEVEL

    JSON config (from `config.json`):
    - polling, audio, gpio, oled, display sections.
    """

    # Environment-driven fields
    server_url: AnyHttpUrl
    device_id: str = Field(min_length=1, description="Unique device identifier")
    piper_model_path: Path
    log_level: str = "INFO"

    # File-driven sections
    polling: PollingConfig
    audio: AudioConfig
    gpio: GPIOConfig
    oled: OledConfig
    display: DisplayConfig

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("log_level")
    @classmethod
    def _normalise_log_level(cls, value: str) -> str:
        return value.upper()

    @field_validator("piper_model_path")
    @classmethod
    def _expand_model_path(cls, value: Path) -> Path:
        return value.expanduser()

    @classmethod
    def load(cls, project_root: Path | None = None) -> "Settings":
        """
        Convenience constructor that:
        - loads `.env` from the project root (if present)
        - loads `config.json` from the project root
        - merges both into a single Settings instance
        """

        root = project_root or PROJECT_ROOT

        # Load .env explicitly so other code using os.getenv sees values too.
        env_path = root / ".env"
        if env_path.exists():
            load_dotenv(env_path, override=False)

        config_path = root / "config.json"
        if not config_path.exists():
            raise FileNotFoundError(f"config.json not found at {config_path}")

        with config_path.open("r", encoding="utf-8") as f:
            config_data = json.load(f)

        # Environment is read indirectly by BaseSettings through os.environ.
        # Here we pass the JSON sections explicitly.
        try:
            return cls(
                polling=config_data["polling"],
                audio=config_data["audio"],
                gpio=config_data["gpio"],
                oled=config_data["oled"],
                display=config_data["display"],
            )
        except KeyError as exc:
            raise KeyError(f"Missing section in config.json: {exc}") from exc


def load_settings_or_exit() -> Settings:
    """
    Helper used by `main.py` to load settings and exit with a clear message
    if validation fails.
    """

    from loguru import logger
    import sys

    try:
        settings = Settings.load()
    except (ValidationError, FileNotFoundError, KeyError) as exc:
        logger.error("Failed to load settings: {}", exc)
        sys.exit(1)

    return settings


__all__ = [
    "Settings",
    "PollingConfig",
    "AudioConfig",
    "GPIOConfig",
    "OledConfig",
    "DisplayConfig",
    "load_settings_or_exit",
]
