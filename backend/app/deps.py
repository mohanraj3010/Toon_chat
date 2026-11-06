import re
import time
from typing import AsyncGenerator, Dict, List, Optional
import uuid
from collections import defaultdict
from fastapi import Depends, Header, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ForbiddenError, RateLimitError, UnauthorizedError
from app.core.logging import get_logger
from app.core.security import verify_supabase_jwt
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.user import RegisterRequest
from app.services.auth_service import AuthService

logger = get_logger("toonchat.deps")

# In-memory sliding window rate limiter for auth routes
_ip_request_timestamps: Dict[str, List[float]] = defaultdict(list)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provides an async database session."""
    async for session in get_db_session():
        yield session


def get_current_token_payload(
    authorization: Optional[str] = Header(None),
) -> Optional[Dict[str, any]]:
    """
    Safely verifies the Supabase JWT header if present and returns the decoded payload.
    Returns None if no Bearer header is present.
    Raises UnauthorizedError if the token is malformed, expired, or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
    return verify_supabase_jwt(token)


async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Optionally extracts and verifies Supabase JWT if an Authorization header is provided.
    Returns None if no header is present or if user does not exist in local DB.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ")[1].strip()
    try:
        payload = verify_supabase_jwt(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_uuid = uuid.UUID(user_id_str)
    except Exception as exc:
        logger.warning("Failed to authenticate user from Bearer token: %s", exc)
        return None

    try:
        stmt = (
            select(User)
            .options(
                selectinload(User.profile),
                selectinload(User.avatars),
                selectinload(User.settings),
            )
            .where(
                User.id == user_uuid,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        result = await db.execute(stmt)
        user = result.scalars().first()
        if user is not None:
            return user

        # Check if user was explicitly soft-deleted
        deleted_stmt = select(User).where(User.id == user_uuid, User.deleted_at.is_not(None))
        deleted_result = await db.execute(deleted_stmt)
        if deleted_result.scalars().first() is not None:
            return None

        # Authenticated Supabase identity exists but user record is not yet in PostgreSQL.
        # Auto-provision user record on the fly so chat and user features succeed immediately.
        token_email = payload.get("email")
        metadata = payload.get("user_metadata") or {}
        raw_username = (
            metadata.get("username")
            or (token_email.split("@")[0] if token_email else None)
            or f"toon_{user_id_str[:8]}"
        )
        clean_username = re.sub(r"[^a-zA-Z0-9_]", "_", str(raw_username))[:30]
        if len(clean_username) < 3:
            clean_username = f"toon_{clean_username}"

        # Ensure unique username
        existing_username = await db.execute(
            select(User).where(func.lower(User.username) == clean_username.lower(), User.id != user_uuid)
        )
        if existing_username.scalars().first() is not None:
            clean_username = f"{clean_username[:22]}_{uuid.uuid4().hex[:6]}"

        # Ensure unique email to avoid collision with pre-existing records
        provision_email = token_email
        if provision_email:
            existing_email = await db.execute(
                select(User).where(func.lower(User.email) == provision_email.lower(), User.id != user_uuid)
            )
            if existing_email.scalars().first() is not None:
                provision_email = None

        raw_display = (
            metadata.get("displayName")
            or metadata.get("display_name")
            or raw_username
            or "Toon Citizen"
        )
        character_base = int(metadata.get("characterBase") or metadata.get("character_base") or 1)
        if character_base < 1 or character_base > 8:
            character_base = 1

        req = RegisterRequest(
            username=clean_username,
            display_name=str(raw_display)[:50],
            email=provision_email,
            character_base=character_base,
        )

        user = await AuthService.provision_user(
            db=db,
            user_id=user_uuid,
            req=req,
            email=provision_email,
            is_verified=bool(payload.get("email_confirmed_at")),
        )
        await db.commit()
        return user
    except Exception as exc:
        logger.exception("Database error loading user: %s", exc)
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected database error occurred while loading user.",
        ) from exc


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """
    Enforces authentication via Supabase JWT.
    Raises UnauthorizedError if unauthenticated.
    """
    if user is None:
        raise UnauthorizedError(
            message="Valid authentication credentials were not provided."
        )
    return user


async def require_active_user(
    user: User = Depends(get_current_user),
) -> User:
    """
    Validates that the authenticated user is currently active and not soft-deleted.
    """
    if not user.is_active or user.deleted_at is not None:
        raise ForbiddenError(
            message="This cartoon account has been deactivated or scheduled for deletion."
        )
    return user


def check_resource_ownership(current_user: User, resource_user_id: uuid.UUID) -> None:
    """
    Validates that the authenticated user owns the cartoon resource being accessed or modified.
    Raises ForbiddenError if user IDs do not match.
    """
    if current_user.id != resource_user_id:
        raise ForbiddenError(
            message="You do not have permission to access or modify this cartoon resource."
        )


async def rate_limit_auth(
    request: Request,
    max_requests: int = 30,
    window_seconds: int = 60,
) -> None:
    """
    Basic sliding-window rate limiter for sensitive authentication endpoints.
    Protects against credential stuffing and registration spam.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    cutoff = now - window_seconds

    # Filter timestamps for this IP within window
    timestamps = [ts for ts in _ip_request_timestamps[client_ip] if ts > cutoff]
    if len(timestamps) >= max_requests:
        raise RateLimitError(
            message="Whoa there, speedy toon! Please slow down and try again in a moment ⏱️✨",
            details={"retry_after_seconds": int(window_seconds - (now - timestamps[0]))},
        )

    timestamps.append(now)
    _ip_request_timestamps[client_ip] = timestamps

