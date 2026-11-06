from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.realtime import SenderSummary
from app.schemas.user import BaseSchema


class ConversationParticipant(BaseSchema):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    status: str = "offline"
    vibe_text: Optional[str] = None
    theme_base: int = 1


class ConversationLastMessage(BaseSchema):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: Optional[uuid.UUID] = None
    sequence: int
    content: str
    type: str = "text"
    created_at: datetime


class ConversationSummaryResponse(BaseSchema):
    id: uuid.UUID
    type: str = "direct"
    title: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme_base: int = 1
    unread_count: int = 0
    is_pinned: bool = False
    is_muted: bool = False
    is_typing: bool = False
    updated_at: datetime
    participants: List[ConversationParticipant] = Field(default_factory=list)
    last_message: Optional[ConversationLastMessage] = None


class ConversationCreateRequest(BaseSchema):
    target_user_id: uuid.UUID


class UserSearchItem(BaseSchema):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    status: Optional[str] = "offline"
    vibe_text: Optional[str] = None
    theme_base: Optional[int] = 1


class MessageHistoryItem(BaseModel):
    """Safe, sanitized representation of a persisted message for REST history and recovery."""
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    conversation_id: uuid.UUID
    sequence: int
    sender_id: Optional[uuid.UUID] = None
    client_message_id: str
    type: str
    body: str
    media_id: Optional[uuid.UUID] = None
    media_url: Optional[str] = None
    reply_to_id: Optional[uuid.UUID] = None
    is_edited: bool = False
    created_at: datetime
    sender: Optional[SenderSummary] = None


class ConversationMessagesResponse(BaseModel):
    """Response envelope for conversation message history and recovery catch-up."""
    model_config = ConfigDict(extra="forbid")

    conversation_id: uuid.UUID
    messages: List[MessageHistoryItem] = Field(
        default_factory=list,
        description="Chronologically ordered messages (sequence ASC).",
    )
    has_more: bool = Field(
        ...,
        description="Indicates whether additional messages exist in the queried direction.",
    )
    oldest_seq: Optional[int] = Field(
        None,
        description="Lowest sequence number present in this batch.",
    )
    latest_seq: Optional[int] = Field(
        None,
        description="Highest sequence number present in this batch.",
    )
    count: int = Field(
        ...,
        description="Number of messages returned in this batch.",
    )
