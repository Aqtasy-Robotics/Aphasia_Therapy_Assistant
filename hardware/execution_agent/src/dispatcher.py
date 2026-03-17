"""Command dispatcher mapping actions to driver coroutines."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Awaitable, Callable, Dict

from loguru import logger
from src.communication.api_client import ApiClient
from src.communication.models import ActionEnum, CommandAck, ExecutionCommand, StatusEnum
from src.settings import Settings

DriverFunc = Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]


class Dispatcher:
    """Route incoming commands to the appropriate driver implementation."""

    def __init__(self, settings: Settings, api_client: ApiClient | None = None) -> None:
        self._settings = settings
        self._device_id = settings.device_id
        self._api_client = api_client
        self._drivers: Dict[ActionEnum, DriverFunc] = {}

    def register_driver(self, action: ActionEnum, driver: DriverFunc) -> None:
        """
        Register a driver implementation for a given action.

        Args:
            action: The ActionEnum value this driver handles.
            driver: Async callable taking a payload dict and returning a result dict.
        """
        self._drivers[action] = driver
        logger.debug("Registered driver for action {}", action.value)

    async def execute(self, command: ExecutionCommand) -> CommandAck:
        """
        Execute the given command via the appropriate driver and build a CommandAck.
        """
        action = command.action
        payload = command.payload or {}

        driver = self._drivers.get(action)
        if driver is None:
            msg = f"No driver registered for action '{action.value}'"
            logger.error(msg)
            return CommandAck(
                command_id=command.command_id,
                device_id=self._device_id,
                status=StatusEnum.ERROR,
                timestamp=datetime.utcnow(),
                error_message=msg,
            )

        try:
            logger.info(
                "Dispatching command_id={} action={} payload={}",
                command.command_id,
                action.value,
                payload,
            )
            # Pass additional context to drivers that need it
            if action == ActionEnum.LISTEN and self._api_client is not None:
                # listen() needs api_client for audio upload and settings for device selection
                result = await driver(payload, self._api_client, self._settings)
            elif action == ActionEnum.SPEAK:
                # speak() needs settings for model path and audio config
                result = await driver(payload, self._settings)
            else:
                # Other drivers just get payload            
                result = await driver(payload)

            # Check if driver returned an error status
            if result and result.get("status") == "error":
                return CommandAck(
                    command_id=command.command_id,
                    device_id=self._device_id,
                    status=StatusEnum.ERROR,
                    timestamp=datetime.utcnow(),
                    result=result,
                    error_message=result.get("error_message"),
                )

            return CommandAck(
                command_id=command.command_id,
                device_id=self._device_id,
                status=StatusEnum.SUCCESS,
                timestamp=datetime.utcnow(),
                result=result or {},
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "Driver for action {} raised an exception for command_id={}: {}",
                action.value,
                command.command_id,
                exc,
            )
            return CommandAck(
                command_id=command.command_id,
                device_id=self._device_id,
                status=StatusEnum.ERROR,
                timestamp=datetime.utcnow(),
                error_message=str(exc),
            )


__all__ = ["Dispatcher"]

