from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RealtimeErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    USER_BLOCKED = "USER_BLOCKED"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    CONFLICT = "CONFLICT"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class RealtimeCloseCode(int, Enum):
    NORMAL_CLOSURE = 1000
    POLICY_VIOLATION = 1008
    MESSAGE_TOO_BIG = 1009
    UNAUTHORIZED_TICKET = 4401
    FORBIDDEN_USER = 4403
    RATE_LIMITED = 4429


class ToonChatEnvelope(BaseModel):
    """
    Standard wire envelope for all ToonChat WebSocket frames.
    Strictly adheres to {type, id, ts, payload}.
    """
    model_config = ConfigDict(extra="forbid")

    type: str = Field(..., min_length=1, max_length=64, description="Event identifier")
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        min_length=1,
        max_length=64,
        description="Unique frame tracking ID",
    )
    ts: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 UTC timestamp",
    )
    payload: Dict[str, Any] = Field(
        default_factory=dict, description="Structured event payload"
    )

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, v: Any) -> str:
        if v is None:
            return str(uuid.uuid4())
        return str(v)

    @field_validator("ts", mode="before")
    @classmethod
    def validate_ts(cls, v: Any) -> str:
        if v is None:
            return datetime.now(timezone.utc).isoformat()
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)


class RealtimeTicketResponse(BaseModel):
    """Response returned when an authenticated client requests a WebSocket ticket."""
    model_config = ConfigDict(from_attributes=True)

    ticket: str = Field(..., description="Short-lived single-use ticket token")
    expires_in: int = Field(60, description="Ticket time-to-live in seconds")
    user_id: uuid.UUID = Field(..., description="Authenticated user bound to ticket")


class PingPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PongPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    echo_id: str


class ConnectionReadyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: uuid.UUID
    session_id: str
    heartbeat_interval_sec: int = 30


class ErrorPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    echo_id: Optional[str] = None


class ChatSendPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    conversation_id: uuid.UUID
    client_message_id: Optional[str] = Field(None, max_length=128)
    client_msg_id: Optional[str] = Field(None, max_length=128)
    type: str = Field("text", min_length=1, max_length=20)
    body: Optional[str] = Field(None, max_length=65535)
    content: Optional[str] = Field(None, max_length=65535)
    media_id: Optional[uuid.UUID] = None
    media_url: Optional[str] = None
    reply_to_id: Optional[uuid.UUID] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"text", "image", "sticker", "voice", "file"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}, got '{v}'")
        return v

    @model_validator(mode="after")
    def populate_aliases(self) -> "ChatSendPayload":
        eff_id = self.client_message_id or self.client_msg_id
        if not eff_id:
            raise ValueError("client_message_id or client_msg_id is required")
        self.client_message_id = eff_id
        self.client_msg_id = eff_id

        eff_body = self.body or self.content
        if not eff_body:
            raise ValueError("body or content is required")
        self.body = eff_body
        self.content = eff_body
        return self


class ChatAckPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    client_message_id: str
    client_msg_id: Optional[str] = None
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    sequence: int
    created_at: str
    status: str = "sent"

    @model_validator(mode="after")
    def populate_client_msg_id(self) -> "ChatAckPayload":
        if not self.client_msg_id:
            self.client_msg_id = self.client_message_id
        return self


class SenderSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class ChatMessagePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sequence: int
    client_message_id: str
    type: str
    body: str
    media_id: Optional[uuid.UUID] = None
    media_url: Optional[str] = None
    reply_to_id: Optional[uuid.UUID] = None
    created_at: str
    sender: SenderSummary


class ChatReadInboundPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    sequence: int = Field(..., ge=1, description="Monotonic sequence number read by member")


class ChatReadBroadcastPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    user_id: uuid.UUID
    last_read_seq: int
    read_at: str


class ChatTypingInboundPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    is_typing: bool


class ChatTypingBroadcastPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    display_name: str
    is_typing: bool
    expires_at: Optional[str] = None


class ChatDeliveredInboundPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    message_id: uuid.UUID
    sequence: int = Field(..., ge=1)


class ChatDeliveredBroadcastPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    message_id: uuid.UUID
    sequence: int
    user_id: uuid.UUID
    delivered_at: str


