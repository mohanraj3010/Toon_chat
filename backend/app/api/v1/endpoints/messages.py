"""
Messages endpoint compatibility module.
Re-exports conversation message handlers and schemas.
"""
from app.api.v1.routers.conversations import (
    MessageCreateRequest,
    send_conversation_message,
    get_conversation_messages,
)
from app.deps import get_current_user, require_active_user, get_db

__all__ = [
    "MessageCreateRequest",
    "send_conversation_message",
    "get_conversation_messages",
    "get_current_user",
    "require_active_user",
    "get_db",
]

