"""Pydantic models for commands exchanged with the FastAPI backend."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ActionEnum(str, Enum):
    """Supported execution actions as defined by the backend contract."""

    SPEAK = "speak"
    LISTEN = "listen"
    SHOW_FACE = "show_face"
    MOVE_HEAD = "move_head"
    SHOW_UI = "show_ui"


class StatusEnum(str, Enum):
    """Status of a command execution acknowledgement."""

    SUCCESS = "success"
    ERROR = "error"


class ExecutionCommand(BaseModel):
    """Command sent from the FastAPI backend to the execution agent."""

    command_id: str = Field(..., description="Unique identifier for this command")
    action: ActionEnum = Field(..., description="Type of action to perform")
    payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Action-specific parameters supplied by the backend",
    )
    timestamp: datetime = Field(
        ..., description="Backend timestamp when the command was created"
    )


class CommandAck(BaseModel):
    """Acknowledgement / result sent back to the backend after executing a command."""

    command_id: str = Field(..., description="Identifier of the executed command")
    device_id: str = Field(..., description="Identifier of this device")
    status: StatusEnum = Field(..., description="Execution status")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Client timestamp when this acknowledgement was generated",
    )
    result: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional result payload (e.g., metadata or measurements)",
    )
    error_message: Optional[str] = Field(
        default=None, description="Error description if status == 'error'"
    )


__all__ = [
    "ActionEnum",
    "StatusEnum",
    "ExecutionCommand",
    "CommandAck",
]

