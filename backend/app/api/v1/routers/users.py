from typing import List, Optional, Union
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.deps import get_current_user_optional, get_db, rate_limit_auth, require_active_user
from app.models.user import Profile, User
from app.schemas.chat import UserSearchItem
from app.schemas.user import CurrentUserResponse, MeStubResponse, PublicProfileResponse, UpdateProfileRequest
from app.services.auth_service import AuthService

logger = get_logger("toonchat.routers.users")

router = APIRouter(prefix="", tags=["users"])


@router.get("/me", response_model=Union[CurrentUserResponse, MeStubResponse])
async def get_current_user_profile(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> Union[CurrentUserResponse, MeStubResponse]:
    """
    Returns the authenticated user bundle if a valid Supabase JWT Bearer token is provided.
    If unauthenticated, returns an explicit unauthenticated response.
    """
    if current_user:
        if not current_user.profile:
            profile = Profile(
                user_id=current_user.id,
                display_name=current_user.username,
                character_base=1,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(current_user, attribute_names=["profile", "avatars", "settings"])
        return AuthService.build_user_response(current_user)

    return MeStubResponse(
        authenticated=False,
        message=(
            "Supabase Auth is the single identity provider. Provide a valid Supabase JWT Bearer token "
            "to resolve the authenticated ToonChat profile."
        ),
        user=None,
    )


@router.patch("/me", response_model=CurrentUserResponse)
async def update_current_user_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """
    Updates the authenticated toon profile attributes (display name, bio, vibe text, character base, status, mood).
    Persists changes directly to PostgreSQL.
    """
    profile = current_user.profile
    if not profile:
        profile = Profile(
            user_id=current_user.id,
            display_name=current_user.username,
            character_base=1,
        )
        db.add(profile)
        current_user.profile = profile

    if req.display_name is not None and req.display_name.strip():
        profile.display_name = req.display_name.strip()
    if req.bio is not None:
        profile.bio = req.bio.strip()
    if req.vibe_text is not None:
        profile.vibe_text = req.vibe_text.strip()
    if req.character_base is not None:
        profile.character_base = req.character_base
    if req.status is not None:
        profile.status = req.status
    if req.mood is not None:
        profile.mood = req.mood

    if req.username is not None and req.username.strip():
        clean_username = req.username.strip()
        if clean_username.lower() != current_user.username.lower():
            collision = await db.execute(
                select(User).where(func.lower(User.username) == clean_username.lower())
            )
            if collision.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="That toon username is already taken! 🙈",
                )
            current_user.username = clean_username

    await db.commit()
    await db.refresh(current_user, attribute_names=["profile", "avatars", "settings"])
    return AuthService.build_user_response(current_user)


@router.get(
    "/users",
    response_model=List[UserSearchItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
)
@router.get(
    "/users/search",
    response_model=List[UserSearchItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
)
async def list_or_search_users(
    q: Optional[str] = Query(None, description="Search term for username or display name"),
    limit: int = Query(20, ge=1, le=50, description="Max users to return"),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[UserSearchItem]:
    """
    Queries active users directly from the PostgreSQL User and Profile models,
    filtering out the current user, matching display names or usernames case-insensitively.
    Does not rely on static mock arrays or offline JSON files.
    """
    try:
        stmt = (
            select(User)
            .outerjoin(Profile, Profile.user_id == User.id)
            .options(selectinload(User.profile))
            .where(
                User.id != current_user.id,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )

        if q and q.strip():
            search_term = f"%{q.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(User.username).like(search_term),
                    func.lower(Profile.display_name).like(search_term),
                )
            )

        stmt = stmt.order_by(User.created_at.desc()).limit(limit)
        res = await db.execute(stmt)
        users = res.scalars().all()

        items: List[UserSearchItem] = []
        for u in users:
            prof = getattr(u, "profile", None)
            items.append(
                UserSearchItem(
                    id=u.id,
                    username=u.username,
                    display_name=(prof.display_name if prof and prof.display_name else u.username),
                    avatar_url=prof.avatar_url if prof else None,
                    status=(prof.status if prof and prof.status else "offline"),
                    vibe_text=(prof.vibe_text if prof else None),
                    theme_base=(prof.character_base if prof and prof.character_base else 1),
                )
            )
        return items

    except Exception as exc:
        logger.exception("Database error while querying users: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected database error occurred while querying users.",
        ) from exc


@router.get(
    "/users/{username_or_id}",
    response_model=PublicProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def get_user_profile_by_username_or_id(
    username_or_id: str,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> PublicProfileResponse:
    """
    Retrieves public profile details for a specific toon by UUID or username.
    Enforces active authentication and serializes sanitized public attributes only.
    """
    user_uuid: Optional[uuid.UUID] = None
    try:
        user_uuid = uuid.UUID(username_or_id)
    except ValueError:
        pass

    stmt = (
        select(User)
        .options(
            selectinload(User.profile),
            selectinload(User.avatars),
            selectinload(User.settings),
        )
        .where(User.deleted_at.is_(None), User.is_active.is_(True))
    )

    if user_uuid:
        stmt = stmt.where(User.id == user_uuid)
    else:
        stmt = stmt.where(func.lower(User.username) == username_or_id.lower().strip())

    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Toon user '{username_or_id}' was not found in Maple Park.",
        )

    return AuthService.build_public_user_response(user)

