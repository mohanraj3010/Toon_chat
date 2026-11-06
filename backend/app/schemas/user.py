import re
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

RESERVED_USERNAMES = {
    "admin",
    "administrator",
    "root",
    "system",
    "toonchat",
    "maplepark",
    "moderator",
    "mod",
    "support",
    "help",
    "api",
    "bot",
    "auth",
}


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class UserRead(BaseSchema):
    id: uuid.UUID
    username: str
    email: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    status: str = "offline"
    vibe_text: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProfileRead(UserRead):
    bio: str = ""
    character_base: int = 1
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    skin_tone: Optional[str] = None
    hair_color: Optional[str] = None
    clothing_color: Optional[str] = None
    favorite_reaction: Optional[str] = None
    mood: Optional[str] = None


class RegisterRequest(BaseSchema):
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=50)
    email: Optional[str] = None
    password: Optional[str] = None  # Supabase Auth handles credentials; optional on FastAPI provisioning
    character_base: int = Field(default=1, ge=1, le=8)
    avatar_config: Optional[Dict[str, Any]] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[a-zA-Z0-9_]{3,30}$", clean):
            raise ValueError(
                "Username must be 3-30 characters long and contain only letters, numbers, and underscores."
            )
        if clean.lower() in RESERVED_USERNAMES:
            raise ValueError(
                f"The username '{clean}' is reserved for Maple Park system accounts. Pick another creative toon name!"
            )
        return clean

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Display name cannot be empty.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean):
            raise ValueError("Please provide a valid email address.")
        return clean.lower()


class LoginRequest(BaseSchema):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class PasswordChangeRequest(BaseSchema):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class CurrentUserResponse(BaseSchema):
    authenticated: bool = True
    user: UserRead
    profile: ProfileRead
    avatar: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None


class PublicProfileResponse(BaseSchema):
    """
    Sanitized public profile schema for toon discovery and user profile views.
    Strictly excludes sensitive user data (email, settings, phone, internal flags).
    """
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    status: str = "offline"
    vibe_text: Optional[str] = None
    bio: str = ""
    character_base: int = 1
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    avatar: Optional[Dict[str, Any]] = None


class UpdateProfileRequest(BaseSchema):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    display_name: Optional[str] = Field(None, min_length=1, max_length=50)
    bio: Optional[str] = Field(None, max_length=160)
    vibe_text: Optional[str] = Field(None, max_length=50)
    character_base: Optional[int] = Field(None, ge=1, le=8)
    status: Optional[str] = Field(None, max_length=20)
    mood: Optional[str] = Field(None, max_length=30)


class MeStubResponse(BaseSchema):
    """
    Reference response schema for unauthenticated / stub responses.
    """
    authenticated: bool = False
    message: str = (
        "Supabase Auth is the single identity provider. Provide a valid Supabase JWT Bearer token "
        "to resolve the authenticated ToonChat profile."
    )
    user: Optional[UserRead] = None

