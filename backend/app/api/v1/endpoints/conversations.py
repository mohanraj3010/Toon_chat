"""
Conversations endpoint re-export compatibility layer.
Directly maps to app.api.v1.routers.conversations.
"""
from app.api.v1.routers.conversations import (
    router,
    list_conversations,
    create_or_get_direct_conversation,
    build_conversation_summary,
)
from app.deps import get_current_user, require_active_user, get_db

__all__ = [
    "router",
    "list_conversations",
    "create_or_get_direct_conversation",
    "build_conversation_summary",
    "get_current_user",
    "require_active_user",
    "get_db",
]

