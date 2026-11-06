import uuid
from typing import Optional
from app.schemas.user import BaseSchema


class FriendUserItem(BaseSchema):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    status: str = "offline"
    vibe_text: Optional[str] = None
    theme_base: int = 1
    is_online: bool = False
    friend_status: str = "none"  # "friends" | "requested" | "pending" | "blocked" | "none"
    bio: Optional[str] = None


class FriendRequestCreate(BaseSchema):
    target_user_id: uuid.UUID


class FriendshipActionResponse(BaseSchema):
    success: bool
    message: str
    status: str

