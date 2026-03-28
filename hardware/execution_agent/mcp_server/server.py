"""Local STDIO MCP server exposing safe hardware tools."""

from __future__ import annotations

import asyncio
import os
import platform
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from mcp.server.fastmcp import FastMCP

EXECUTION_AGENT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = EXECUTION_AGENT_DIR.parent.parent
SRC_DIR = EXECUTION_AGENT_DIR / "src"
for _path in (str(EXECUTION_AGENT_DIR), str(SRC_DIR), str(REPO_ROOT)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from env_bootstrap import load_agent_env_files  # noqa: E402
from kivy_touch_config import configure_kivy_touch  # noqa: E402
from src.services import audio_utils, ear, mouth  # noqa: E402
from src.settings import Settings  # noqa: E402

mcp = FastMCP("waabi-hardware-local")


class _NoopUploader:
    async def send_audio(self, _wav_bytes: bytes) -> bool:
        return True


_settings_cache: Optional[Settings] = None
_ui_import_done = False
_ui_module = None


def _ok(data: Dict[str, Any]) -> Dict[str, Any]:
    return {"ok": True, "data": data, "error": None}


def _err(code: str, message: str, *, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {
        "ok": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
    }


def _bridge_headers() -> Dict[str, str]:
    key = (os.getenv("BRIDGE_COMMAND_API_KEY") or "").strip()
    if key:
        return {"X-Bridge-Key": key}
    return {}


async def _bridge_post_json(path: str, body: Dict[str, Any], timeout_s: float = 30.0) -> Dict[str, Any]:
    """POST JSON to FastAPI bridge (SERVER_URL from execution_agent settings)."""
    try:
        settings = _get_settings()
    except Exception as exc:  # noqa: BLE001
        return _err("settings_load_failed", str(exc))
    base = str(settings.server_url).rstrip("/")
    url = f"{base}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.post(url, json=body, headers=_bridge_headers())
        try:
            data = response.json() if response.content else {}
        except Exception:  # noqa: BLE001
            data = {"raw": response.text}
        if response.is_success:
            return _ok({"http_status": response.status_code, "response": data})
        return _err(
            "bridge_http_error",
            f"HTTP {response.status_code}",
            details={"url": url, "response": data},
        )
    except Exception as exc:  # noqa: BLE001
        return _err("bridge_request_failed", str(exc), details={"url": url})


async def _bridge_get(path: str, timeout_s: float = 15.0) -> Dict[str, Any]:
    try:
        settings = _get_settings()
    except Exception as exc:  # noqa: BLE001
        return _err("settings_load_failed", str(exc))
    base = str(settings.server_url).rstrip("/")
    url = f"{base}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.get(url)
        try:
            data = response.json() if response.content else {}
        except Exception:  # noqa: BLE001
            data = {"raw": response.text}
        if response.is_success:
            return _ok({"http_status": response.status_code, "response": data})
        return _err(
            "bridge_http_error",
            f"HTTP {response.status_code}",
            details={"url": url, "response": data},
        )
    except Exception as exc:  # noqa: BLE001
        return _err("bridge_request_failed", str(exc), details={"url": url})


def _get_settings() -> Settings:
    global _settings_cache
    if _settings_cache is not None:
        return _settings_cache
    load_agent_env_files(EXECUTION_AGENT_DIR)
    _settings_cache = Settings.load(project_root=EXECUTION_AGENT_DIR)
    return _settings_cache


def _load_ui_module():
    global _ui_import_done, _ui_module
    if _ui_module is not None:
        return _ui_module
    if not _ui_import_done:
        load_agent_env_files(EXECUTION_AGENT_DIR)
        configure_kivy_touch()
        _ui_import_done = True
    from src.ui import body_app  # noqa: PLC0415

    _ui_module = body_app
    return _ui_module


def _list_devices_structured() -> list[Dict[str, Any]]:
    if not audio_utils.SOUNDDEVICE_AVAILABLE:
        return []
    raw_devices = audio_utils.sd.query_devices()
    out: list[Dict[str, Any]] = []
    for idx, dev in enumerate(raw_devices):
        out.append(
            {
                "index": idx,
                "name": str(dev.get("name", "")),
                "max_input_channels": int(dev.get("max_input_channels", 0)),
                "max_output_channels": int(dev.get("max_output_channels", 0)),
                "default_samplerate": float(dev.get("default_samplerate", 0.0)),
                "hostapi": int(dev.get("hostapi", -1)),
            }
        )
    return out


@mcp.tool()
def health_check() -> Dict[str, Any]:
    """Return runtime and hardware capability summary."""
    try:
        settings = _get_settings()
    except Exception as exc:  # noqa: BLE001
        return _err("settings_load_failed", str(exc))

    return _ok(
        {
            "runtime": {
                "python": sys.version.split()[0],
                "platform": platform.platform(),
            },
            "paths": {
                "execution_agent_dir": str(EXECUTION_AGENT_DIR),
                "repo_root": str(REPO_ROOT),
            },
            "env": {
                "server_url": str(settings.server_url),
                "device_id": settings.device_id,
                "piper_model_path": str(settings.piper_model_path),
                "kivy_keyboard_mode": os.getenv("KIVY_KEYBOARD_MODE", ""),
            },
            "capabilities": {
                "sounddevice_available": bool(audio_utils.SOUNDDEVICE_AVAILABLE),
                "piper_available": bool(mouth.PIPER_AVAILABLE),
            },
        }
    )


@mcp.tool()
def audio_list_devices() -> Dict[str, Any]:
    """List audio input/output devices with indices."""
    try:
        devices = _list_devices_structured()
        return _ok(
            {
                "sounddevice_available": bool(audio_utils.SOUNDDEVICE_AVAILABLE),
                "count": len(devices),
                "devices": devices,
            }
        )
    except Exception as exc:  # noqa: BLE001
        return _err("audio_list_failed", str(exc))


@mcp.tool()
async def audio_listen(
    duration_s: float = 5.0,
    sample_rate: Optional[int] = None,
    channels: Optional[int] = None,
    prompt: str = "",
    upload: bool = False,
    timeout_s: float = 20.0,
) -> Dict[str, Any]:
    """Record microphone audio using existing ear driver."""
    try:
        settings = _get_settings()
    except Exception as exc:  # noqa: BLE001
        return _err("settings_load_failed", str(exc))

    payload: Dict[str, Any] = {
        "duration_s": duration_s,
        "prompt": prompt,
    }
    if sample_rate is not None:
        settings.audio.sample_rate = int(sample_rate)
    if channels is not None:
        settings.audio.channels = int(channels)

    api_client = None
    close_client = False
    if upload:
        try:
            from src.communication.api_client import ApiClient  # noqa: PLC0415

            api_client = ApiClient(settings)
            close_client = True
        except Exception as exc:  # noqa: BLE001
            return _err("api_client_init_failed", str(exc))
    else:
        api_client = _NoopUploader()

    try:
        result = await asyncio.wait_for(ear.listen(payload, api_client=api_client, settings=settings), timeout=timeout_s)
        status = str(result.get("status", "")).lower()
        if status.startswith("ok"):
            return _ok(result)
        return _err("audio_listen_failed", str(result.get("error_message") or "listen failed"), details={"result": result})
    except asyncio.TimeoutError:
        return _err("audio_listen_timeout", f"listen exceeded timeout ({timeout_s}s)")
    except Exception as exc:  # noqa: BLE001
        return _err("audio_listen_exception", str(exc))
    finally:
        if close_client and api_client is not None:
            try:
                await api_client.aclose()
            except Exception:  # noqa: BLE001
                pass


@mcp.tool()
async def audio_speak(
    text: str,
    voice: str = "default",
    volume: Optional[float] = None,
    timeout_s: float = 30.0,
) -> Dict[str, Any]:
    """Speak text through Piper TTS and output device."""
    if not text.strip():
        return _err("invalid_input", "text cannot be empty")
    try:
        settings = _get_settings()
    except Exception as exc:  # noqa: BLE001
        return _err("settings_load_failed", str(exc))

    payload: Dict[str, Any] = {"text": text, "voice": voice}
    if volume is not None:
        payload["volume"] = volume

    try:
        result = await asyncio.wait_for(mouth.speak(payload, settings=settings), timeout=timeout_s)
        status = str(result.get("status", "")).lower()
        if status.startswith("ok"):
            return _ok(result)
        return _err("audio_speak_failed", str(result.get("error_message") or "speak failed"), details={"result": result})
    except asyncio.TimeoutError:
        return _err("audio_speak_timeout", f"speak exceeded timeout ({timeout_s}s)")
    except Exception as exc:  # noqa: BLE001
        return _err("audio_speak_exception", str(exc))


@mcp.tool()
def ui_start() -> Dict[str, Any]:
    """Start Kivy UI app once and report readiness."""
    try:
        ui = _load_ui_module()
        started = bool(ui.ensure_app_running(EXECUTION_AGENT_DIR))
        return _ok({"started": started, "ui_ready": bool(ui.is_ui_ready())})
    except Exception as exc:  # noqa: BLE001
        return _err("ui_start_failed", str(exc))


@mcp.tool()
async def ui_show(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Queue a UI update payload (screen/message/progress etc)."""
    try:
        ui = _load_ui_module()
        await ui.show_ui(payload)
        return _ok({"queued": True, "payload": payload, "ui_ready": bool(ui.is_ui_ready())})
    except Exception as exc:  # noqa: BLE001
        return _err("ui_show_failed", str(exc))


@mcp.tool()
def ui_events_read(max_items: int = 16) -> Dict[str, Any]:
    """Read queued UI touch/session events."""
    if max_items < 1:
        return _err("invalid_input", "max_items must be >= 1")
    try:
        ui = _load_ui_module()
        events = ui.dequeue_ui_events(max_items=max_items)
        return _ok({"count": len(events), "events": events})
    except Exception as exc:  # noqa: BLE001
        return _err("ui_events_read_failed", str(exc))


@mcp.tool()
def ui_ready() -> Dict[str, Any]:
    """Return whether Kivy UI loop is running."""
    try:
        ui = _load_ui_module()
        return _ok({"ui_ready": bool(ui.is_ui_ready())})
    except Exception as exc:  # noqa: BLE001
        return _err("ui_ready_failed", str(exc))


@mcp.tool()
async def bridge_health_remote() -> Dict[str, Any]:
    """Ping the FastAPI bridge GET /health (run backend on your laptop; Pi uses SERVER_URL to reach it)."""
    return await _bridge_get("/health")


async def _enqueue_for_robot(action: str, payload: Dict[str, Any], device_id: Optional[str]) -> Dict[str, Any]:
    try:
        settings = _get_settings()
    except Exception as exc:  # noqa: BLE001
        return _err("settings_load_failed", str(exc))
    rid = (device_id or settings.device_id or "").strip()
    if not rid:
        return _err("invalid_input", "device_id is empty; set DEVICE_ID in .env or pass device_id")
    body = {"action": (action or "").strip().lower(), "payload": dict(payload or {})}
    return await _bridge_post_json(f"/commands/{rid}/enqueue", body)


@mcp.tool()
async def bridge_enqueue_command(
    action: str,
    payload: Dict[str, Any],
    device_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Queue a command for the Raspberry Pi. The Pi polls GET /commands/{device_id} and runs speak/listen/show_ui on device hardware.

    device_id defaults to DEVICE_ID from .env (must match the Pi's DEVICE_ID).

    Actions: speak, listen, show_ui, show_face, move_head.
    Examples:
      speak: payload {\"text\": \"Hello\"}
      listen: payload {\"duration_s\": 5}
      show_ui: payload {\"screen\": \"practice_word\", \"word\": \"Apple\"}
    """
    return await _enqueue_for_robot(action, payload, device_id)


@mcp.tool()
async def bridge_speak_on_robot(
    text: str,
    device_id: Optional[str] = None,
    volume: Optional[float] = None,
) -> Dict[str, Any]:
    """Enqueue TTS on the Pi (Piper + speaker on the robot)."""
    if not (text or "").strip():
        return _err("invalid_input", "text is required")
    payload: Dict[str, Any] = {"text": text}
    if volume is not None:
        payload["volume"] = volume
    return await _enqueue_for_robot("speak", payload, device_id)


@mcp.tool()
async def bridge_listen_on_robot(
    duration_s: float = 5.0,
    prompt: str = "",
    device_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Enqueue microphone recording on the Pi; audio may upload to bridge per ear driver settings."""
    return await _enqueue_for_robot(
        "listen",
        {"duration_s": duration_s, "prompt": prompt},
        device_id,
    )


@mcp.tool()
async def bridge_show_ui_on_robot(
    screen: str = "practice_word",
    message: str = "",
    word: str = "",
    device_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Enqueue a Kivy UI update on the Pi (same payload shape as local ui_show)."""
    pl: Dict[str, Any] = {"screen": screen}
    if message:
        pl["message"] = message
    if word:
        pl["word"] = word
    return await _enqueue_for_robot("show_ui", pl, device_id)


def main() -> None:
    mcp.run(transport="stdio")


__all__ = ["mcp", "main"]

