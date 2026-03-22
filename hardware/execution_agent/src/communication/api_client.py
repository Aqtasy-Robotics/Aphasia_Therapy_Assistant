"""Asynchronous HTTP client for communicating with the FastAPI backend."""

from __future__ import annotations

import asyncio
from typing import Optional
import logging

import httpx

from src.communication.models import CommandAck, ExecutionCommand, UiEventPayload
from src.settings import Settings


logger = logging.getLogger(__name__)


class ApiClient:
    """HTTP client responsible for polling commands and sending results/audio."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._device_id = settings.device_id

        timeout = httpx.Timeout(
            settings.polling.timeout_seconds,
            connect=settings.polling.timeout_seconds,
            read=settings.polling.timeout_seconds,
            write=settings.polling.timeout_seconds,
        )

        self._client = httpx.AsyncClient(
            base_url=str(settings.server_url),
            timeout=timeout,
        )

    @property
    def device_id(self) -> str:
        return self._device_id

    async def aclose(self) -> None:
        """Close underlying HTTP client."""
        await self._client.aclose()

    async def _request_with_retries(
        self,
        method: str,
        url: str,
        *,
        max_retries: Optional[int] = None,
        **kwargs,
    ) -> Optional[httpx.Response]:
        """Perform an HTTP request with exponential backoff retry logic."""
        retries = max_retries if max_retries is not None else self._settings.polling.max_retries
        base_delay = 1.0

        for attempt in range(retries + 1):
            try:
                response = await self._client.request(method, url, **kwargs)

                # Retry on 5xx responses
                if 500 <= response.status_code < 600:
                    raise httpx.HTTPStatusError(
                        f"Server error: {response.status_code}",
                        request=response.request,
                        response=response,
                    )

                return response

            except (httpx.ConnectError, httpx.ReadTimeout, httpx.NetworkError, httpx.HTTPStatusError) as exc:
                if attempt >= retries:
                    logger.error(
                        "HTTP %s %s failed after %s attempts: %s",
                        method,
                        url,
                        attempt + 1,
                        exc,
                    )
                    return None

                delay = base_delay * (2**attempt)
                logger.warning(
                    "HTTP %s %s failed on attempt %s/%s: %s – retrying in %.1fs",
                    method,
                    url,
                    attempt + 1,
                    retries + 1,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)

        return None

    async def poll_command(self) -> Optional[ExecutionCommand]:
        """
        Poll the backend for the next command for this device.

        Returns:
            ExecutionCommand instance if a command is available, otherwise None.
        """
        endpoint = f"/commands/{self._device_id}"
        response = await self._request_with_retries("GET", endpoint)

        if response is None:
            return None

        if response.status_code == 404:
            # No command available is treated as a normal condition
            logger.debug("No command available (404) for device %s", self._device_id)
            return None

        if response.status_code == 204:
            logger.debug("No command available (204) for device %s", self._device_id)
            return None

        try:
            data = response.json()
        except ValueError as exc:
            logger.error("Failed to decode JSON from /commands response: %s", exc)
            return None

        if data is None:
            logger.debug("No command available (null body) for device %s", self._device_id)
            return None

        try:
            command = ExecutionCommand.model_validate(data)
        except Exception as exc:  # ValidationError in pydantic v2, keep generic to avoid import churn
            logger.error("Invalid ExecutionCommand payload received: %s", exc)
            return None

        return command

    async def send_ack(self, ack: CommandAck) -> None:
        """
        Send an acknowledgement for a previously executed command.

        Best-effort: errors are logged but not raised.
        """
        endpoint = "/status"
        response = await self._request_with_retries(
            "POST",
            endpoint,
            json=ack.model_dump(mode="json"),
        )

        if response is None:
            logger.error(
                "Failed to send CommandAck for command_id=%s after retries",
                ack.command_id,
            )
            return

        if response.is_success:
            logger.debug(
                "Sent CommandAck for command_id=%s with status=%s",
                ack.command_id,
                ack.status.value,
            )
        else:
            logger.error(
                "Non-success response when sending CommandAck for command_id=%s: %s",
                ack.command_id,
                response.status_code,
            )

    async def send_audio(self, wav_bytes: bytes) -> bool:
        """
        Upload recorded WAV audio to the backend for this device.

        Args:
            wav_bytes: Raw WAV file bytes.

        Returns:
            True if upload succeeded, False otherwise.
        """
        endpoint = f"/audio/{self._device_id}"
        files = {"file": ("audio.wav", wav_bytes, "audio/wav")}

        response = await self._request_with_retries("POST", endpoint, files=files)
        if response is None:
            logger.error(
                "Failed to upload audio for device %s after retries",
                self._device_id,
            )
            return False

        if response.is_success:
            logger.debug(
                "Uploaded audio for device %s successfully",
                self._device_id,
            )
            return True

        logger.error(
            "Non-success response when uploading audio for device %s: %s",
            self._device_id,
            response.status_code,
        )
        return False

    async def post_ui_event(self, event: dict) -> bool:
        """
        POST a touch or local UI event to the bridge (best-effort).

        Expected keys (see emit_touch_event in body_app): type, payload, timestamp.
        """
        try:
            data = UiEventPayload.model_validate(event).model_dump(mode="json")
        except Exception as exc:
            logger.warning("Skipping invalid UI event payload: %s: %s", exc, event)
            return False

        endpoint = f"/ui-events/{self._device_id}"
        response = await self._request_with_retries("POST", endpoint, json=data)

        if response is None:
            logger.warning("Failed to POST UI event type=%s after retries", data.get("type"))
            return False

        if response.is_success:
            logger.debug("Posted UI event type=%s", data.get("type"))
            return True

        logger.warning(
            "Non-success response when posting UI event type=%s: %s",
            data.get("type"),
            response.status_code,
        )
        return False

    async def health_check(self) -> bool:
        """
        Check if the backend is reachable.

        Returns:
            True if the server responded with a successful status, False otherwise.
        """
        endpoint = "/health"
        response = await self._request_with_retries("GET", endpoint)

        if response is None:
            logger.warning("Health check failed – backend not reachable")
            return False

        if response.is_success:
            logger.info("Health check succeeded – backend is reachable")
            return True

        logger.warning(
            "Health check returned non-success status code: %s",
            response.status_code,
        )
        return False


__all__ = ["ApiClient"]
