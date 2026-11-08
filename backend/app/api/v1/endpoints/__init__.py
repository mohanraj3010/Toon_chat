"""
Endpoints module compatibility layer re-exporting v1 routers.
"""
from app.api.v1.routers import conversations, auth, friends, media, realtime, users

__all__ = ["conversations", "auth", "friends", "media", "realtime", "users"]

