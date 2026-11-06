from datetime import datetime
from typing import Any, Dict, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models.avatar import Avatar
from app.models.user import Profile, User, UserSettings
from app.schemas.user import CurrentUserResponse, ProfileRead, PublicProfileResponse, RegisterRequest, UserRead

DEFAULT_AVATAR_CONFIG = {
    "version": 1,
    "name": "Luna",
    "background": "bg-pastel-swirl",
    "backgroundColor": "#f3e8ff",
    "headShape": "head-chubby",
    "skinTone": "#ffd8c2",
    "eyes": "eyes-sparkle",
    "eyeColor": "#49255a",
    "eyebrows": "brows-soft",
    "eyebrowColor": "#3b224c",
    "nose": "nose-button",
    "mouth": "mouth-open-happy",
    "blush": "blush-soft-pink",
    "hairStyle": "hair-bob-bangs",
    "hairColor": "#7e5294",
    "facialHair": "none",
    "facialHairColor": "#3b224c",
    "outfit": "outfit-hoodie",
    "outfitPrimaryColor": "#a7f3d0",
    "outfitSecondaryColor": "#34d399",
    "glasses": "none",
    "glassesColor": "#1f2937",
    "hat": "none",
    "hatColor": "#f472b6",
    "earrings": "none",
    "earringsColor": "#fbbf24",
    "headphones": "none",
    "headphonesColor": "#ec4899",
    "expression": "happy",
}


class AuthService:
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        stmt = (
            select(User)
            .options(
                selectinload(User.profile),
                selectinload(User.avatars),
                selectinload(User.settings),
            )
            .where(User.id == user_id, User.deleted_at.is_(None))
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def provision_user(
        db: AsyncSession,
        user_id: uuid.UUID,
        req: RegisterRequest,
        email: Optional[str] = None,
        is_verified: bool = False,
    ) -> User:
        """
        Provisions a new ToonChat user, public profile, default cartoon avatar,
        and user settings within a single atomic database transaction.
        
        Guarantees:
        1. Idempotency: Retrying with the same user_id returns the existing user.
        2. Collision protection: Rejects duplicate username or email with ConflictError (409).
        3. Never stores Supabase passwords in public.users.
        4. Partial failure safety: Rolled back completely if any entity creation fails.
        """
        # 1. Check idempotency: If user already exists, return existing user
        existing_user = await AuthService.get_user_by_id(db, user_id)
        if existing_user is not None:
            return existing_user

        target_email = (req.email or email or "").strip().lower() or None

        # 2. Check for username collision (case-insensitive)
        stmt_username = select(User).where(
            func.lower(User.username) == req.username.lower(),
            User.id != user_id,
        )
        res_user = await db.execute(stmt_username)
        if res_user.scalars().first() is not None:
            raise ConflictError(
                message="That toon name is already taken! Try another creative username ✨",
                details={"field": "username"},
            )

        # 3. Check for email collision if email provided
        if target_email:
            stmt_email = select(User).where(
                func.lower(User.email) == target_email,
                User.id != user_id,
            )
            res_email = await db.execute(stmt_email)
            if res_email.scalars().first() is not None:
                raise ConflictError(
                    message="An account with this email already exists in Maple Park.",
                    details={"field": "email"},
                )

        # 4. Atomically insert User, Profile, Avatar, and Settings
        user = User(
            id=user_id,
            username=req.username,
            email=target_email,
            password_hash=None,  # Never store Supabase passwords in public.users
            is_active=True,
            is_verified=is_verified,
        )
        db.add(user)

        profile = Profile(
            user_id=user_id,
            display_name=req.display_name,
            character_base=req.character_base,
            bio="",
            vibe_text="",
            status="online",
        )
        db.add(profile)

        avatar_config = req.avatar_config or DEFAULT_AVATAR_CONFIG
        avatar = Avatar(
            user_id=user_id,
            version=1,
            is_current=True,
            config=avatar_config,
        )
        db.add(avatar)

        settings = UserSettings(
            user_id=user_id,
            who_can_message="everyone",
            who_can_see_status="everyone",
            find_by_email=True,
            find_by_phone=True,
            show_reading_activity=True,
            notifications_json={},
            appearance_json={},
            chat_json={},
            two_factor_enabled=False,
        )
        db.add(settings)

        await db.commit()
        await db.refresh(user, attribute_names=["profile", "avatars", "settings"])
        return user

    @staticmethod
    def build_user_response(user: User) -> CurrentUserResponse:
        """Transforms a User ORM instance into CurrentUserResponse."""
        profile = user.profile
        current_avatar = next((a for a in user.avatars if a.is_current), None)
        avatar_dict = current_avatar.config if current_avatar else None

        user_read = UserRead(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=profile.display_name if profile else user.username,
            avatar_url=profile.avatar_url if profile else None,
            status=profile.status if profile else "offline",
            vibe_text=profile.vibe_text if profile else None,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at or datetime.utcnow(),
        )

        profile_read = ProfileRead(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=profile.display_name if profile else user.username,
            avatar_url=profile.avatar_url if profile else None,
            status=profile.status if profile else "offline",
            vibe_text=profile.vibe_text if profile else None,
            bio=profile.bio if profile else "",
            character_base=profile.character_base if profile else 1,
            joined_at=profile.created_at if profile else datetime.utcnow(),
            skin_tone=profile.skin_tone if profile else None,
            hair_color=profile.hair_color if profile else None,
            clothing_color=profile.clothing_color if profile else None,
            favorite_reaction=profile.favorite_reaction if profile else None,
            mood=profile.mood if profile else None,
        )

        settings_dict = {
            "whoCanMessage": user.settings.who_can_message if user.settings else "everyone",
            "whoCanSeeStatus": user.settings.who_can_see_status if user.settings else "everyone",
            "findByEmail": user.settings.find_by_email if user.settings else True,
            "twoFactorEnabled": user.settings.two_factor_enabled if user.settings else False,
        } if user.settings else None

        return CurrentUserResponse(
            authenticated=True,
            user=user_read,
            profile=profile_read,
            avatar=avatar_dict,
            settings=settings_dict,
        )

    @staticmethod
    def build_public_user_response(user: User) -> PublicProfileResponse:
        """Transforms a User ORM instance into a sanitized PublicProfileResponse."""
        profile = user.profile
        current_avatar = next((a for a in user.avatars if a.is_current), None) if user.avatars else None
        avatar_dict = current_avatar.config if current_avatar else None

        return PublicProfileResponse(
            id=user.id,
            username=user.username,
            display_name=profile.display_name if profile else user.username,
            avatar_url=profile.avatar_url if profile else None,
            status=profile.status if profile else "offline",
            vibe_text=profile.vibe_text if profile else None,
            bio=profile.bio if profile else "",
            character_base=profile.character_base if profile else 1,
            joined_at=profile.created_at if profile else (user.created_at or datetime.utcnow()),
            avatar=avatar_dict,
        )

    @staticmethod
    async def soft_delete_user(db: AsyncSession, user: User) -> None:
        """Performs a safe soft deletion of the user account."""
        user.is_active = False
        user.deleted_at = func.now()
        if user.profile:
            user.profile.display_name = f"Deleted Toon ({str(user.id)[:8]})"
            user.profile.bio = "This cartoon account has been closed."
            user.profile.status = "offline"
        await db.flush()
