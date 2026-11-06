import pytest
from app.db.base import Base
import app.models


def test_models_metadata_registration():
    """Verifies that all 21 models are properly registered in SQLAlchemy metadata."""
    tables = Base.metadata.tables
    expected_tables = [
        "users",
        "profiles",
        "user_settings",
        "user_sessions",
        "avatars",
        "friendships",
        "blocks",
        "conversations",
        "conversation_members",
        "messages",
        "message_reactions",
        "groups",
        "group_invites",
        "stories",
        "story_views",
        "story_reactions",
        "notifications",
        "media",
        "sticker_packs",
        "stickers",
        "world_presence",
    ]

    for table in expected_tables:
        assert table in tables, f"Expected table '{table}' not found in Base.metadata.tables"
