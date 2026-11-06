from typing import Any, Dict, Optional
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import (
    get_current_token_payload,
    get_current_user_optional,
    get_db,
    rate_limit_auth,
    require_active_user,
)
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import (
    CurrentUserResponse,
    PasswordChangeRequest,
    RegisterRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
)
async def register_user(
    req: RegisterRequest,
    token_payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """
    Provisions a new ToonChat user, profile, and default avatar config.
    
    Architecture rules:
    - If a valid Supabase JWT Bearer token is provided, uses its 'sub' UUID as the primary key.
    - If no Bearer token is passed (e.g. initial direct registration or test fixture),
      derives user UUID deterministically or generates a unique UUID.
    - Never stores Supabase passwords in public.users.
    - Idempotent and safe against partial failures.
    """
    if token_payload and "sub" in token_payload:
        user_uuid = uuid.UUID(str(token_payload["sub"]))
        token_email = token_payload.get("email")
        is_verified = bool(
            token_payload.get("email_confirmed_at")
            or token_payload.get("user_metadata", {}).get("email_verified")
        )
    else:
        user_uuid = uuid.uuid4()
        token_email = req.email
        is_verified = False

    user = await AuthService.provision_user(
        db=db,
        user_id=user_uuid,
        req=req,
        email=token_email,
        is_verified=is_verified,
    )
    await db.commit()
    return AuthService.build_user_response(user)


@router.get("/me", response_model=CurrentUserResponse)
async def get_authenticated_user(
    current_user: User = Depends(require_active_user),
) -> CurrentUserResponse:
    """Returns the authenticated user, profile, avatar, and settings."""
    return AuthService.build_user_response(current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> MessageResponse:
    """Acknowledge session termination and guide client cache purge."""
    return MessageResponse(message="Successfully signed out of ToonChat session.")


@router.post(
    "/password/change",
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit_auth)],
)
async def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(require_active_user),
) -> MessageResponse:
    """
    FastAPI endpoint acknowledging password changes.
    Supabase Auth manages the actual credential hashing and update.
    """
    return MessageResponse(
        message="Password change request processed successfully via Supabase Auth identity provider."
    )


@router.delete("/account", response_model=MessageResponse)
async def delete_account(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Soft-deletes the user's ToonChat account and anonymizes their public profile."""
    await AuthService.soft_delete_user(db, current_user)
    return MessageResponse(
        message="Your cartoon account has been closed. We hope to see you back in Maple Park!"
    )
