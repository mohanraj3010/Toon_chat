from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.deps import get_db, rate_limit_auth, require_active_user
from app.models.social import Block, Friendship
from app.models.user import Profile, User
from app.schemas.social import (
    FriendRequestCreate,
    FriendshipActionResponse,
    FriendUserItem,
)

logger = get_logger("toonchat.routers.friends")

router = APIRouter(prefix="/friends", tags=["friends"])


def _map_user_to_friend_item(
    u: User, friend_status: str
) -> FriendUserItem:
    prof = getattr(u, "profile", None)
    status_val = prof.status if prof and prof.status else "offline"
    is_online = status_val in ("online", "away")
    return FriendUserItem(
        id=u.id,
        username=u.username,
        display_name=prof.display_name if prof and prof.display_name else u.username,
        avatar_url=prof.avatar_url if prof else None,
        status=status_val,
        vibe_text=prof.vibe_text if prof else None,
        theme_base=prof.character_base if prof and prof.character_base else 1,
        is_online=is_online,
        friend_status=friend_status,
        bio=prof.bio if prof else None,
    )


@router.get("", response_model=List[FriendUserItem], status_code=status.HTTP_200_OK)
async def list_friends(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[FriendUserItem]:
    """
    Returns all confirmed friends for the authenticated toon.
    """
    stmt = (
        select(Friendship)
        .options(
            selectinload(Friendship.requester).selectinload(User.profile),
            selectinload(Friendship.addressee).selectinload(User.profile),
        )
        .where(
            Friendship.status == "accepted",
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
        )
        .order_by(Friendship.updated_at.desc())
    )
    res = await db.execute(stmt)
    friendships = res.scalars().all()

    items: List[FriendUserItem] = []
    for f in friendships:
        peer = f.addressee if f.requester_id == current_user.id else f.requester
        if peer and peer.is_active and not peer.deleted_at:
            items.append(_map_user_to_friend_item(peer, "friends"))
    return items


@router.get("/requests", response_model=List[FriendUserItem], status_code=status.HTTP_200_OK)
async def list_incoming_requests(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[FriendUserItem]:
    """
    Returns pending incoming friend requests addressed to current user.
    """
    stmt = (
        select(Friendship)
        .options(selectinload(Friendship.requester).selectinload(User.profile))
        .where(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .order_by(Friendship.created_at.desc())
    )
    res = await db.execute(stmt)
    requests = res.scalars().all()

    items: List[FriendUserItem] = []
    for f in requests:
        if f.requester and f.requester.is_active and not f.requester.deleted_at:
            items.append(_map_user_to_friend_item(f.requester, "pending"))
    return items


@router.get("/sent", response_model=List[FriendUserItem], status_code=status.HTTP_200_OK)
async def list_sent_requests(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[FriendUserItem]:
    """
    Returns pending friend requests sent by current user.
    """
    stmt = (
        select(Friendship)
        .options(selectinload(Friendship.addressee).selectinload(User.profile))
        .where(
            Friendship.requester_id == current_user.id,
            Friendship.status == "pending",
        )
        .order_by(Friendship.created_at.desc())
    )
    res = await db.execute(stmt)
    requests = res.scalars().all()

    items: List[FriendUserItem] = []
    for f in requests:
        if f.addressee and f.addressee.is_active and not f.addressee.deleted_at:
            items.append(_map_user_to_friend_item(f.addressee, "requested"))
    return items


@router.get("/blocked", response_model=List[FriendUserItem], status_code=status.HTTP_200_OK)
async def list_blocked_users(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[FriendUserItem]:
    """
    Returns users blocked by current user.
    """
    stmt = (
        select(Block)
        .options(selectinload(Block.blocked).selectinload(User.profile))
        .where(Block.blocker_id == current_user.id)
        .order_by(Block.created_at.desc())
    )
    res = await db.execute(stmt)
    blocks = res.scalars().all()

    items: List[FriendUserItem] = []
    for b in blocks:
        if b.blocked and b.blocked.is_active and not b.blocked.deleted_at:
            items.append(_map_user_to_friend_item(b.blocked, "blocked"))
    return items


@router.post(
    "/request",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
)
async def send_friend_request(
    req: FriendRequestCreate,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Sends a friend request to a target toon user.
    """
    if req.target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a friend request to yourself!",
        )

    # Check target exists
    target = await db.get(User, req.target_user_id)
    if not target or not target.is_active or target.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target toon user not found.",
        )

    # Check if blocked
    block_stmt = select(Block).where(
        or_(
            and_(Block.blocker_id == current_user.id, Block.blocked_id == req.target_user_id),
            and_(Block.blocker_id == req.target_user_id, Block.blocked_id == current_user.id),
        )
    )
    block_res = await db.execute(block_stmt)
    if block_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request due to privacy or block settings.",
        )

    # Check existing friendship
    f_stmt = select(Friendship).where(
        or_(
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == req.target_user_id),
            and_(Friendship.requester_id == req.target_user_id, Friendship.addressee_id == current_user.id),
        )
    )
    f_res = await db.execute(f_stmt)
    existing = f_res.scalars().first()

    if existing:
        if existing.status == "accepted":
            return FriendshipActionResponse(
                success=True,
                message="You are already friends with this toon! 🎉",
                status="friends",
            )
        if existing.status == "pending":
            if existing.requester_id == current_user.id:
                return FriendshipActionResponse(
                    success=True,
                    message="Friend request already sent!",
                    status="requested",
                )
            else:
                # They sent us one! Automatically accept
                existing.status = "accepted"
                await db.commit()
                return FriendshipActionResponse(
                    success=True,
                    message="Mutual friend request accepted! You are now friends! 🎉",
                    status="friends",
                )
        # If declined or canceled, re-request
        existing.requester_id = current_user.id
        existing.addressee_id = req.target_user_id
        existing.status = "pending"
    else:
        new_f = Friendship(
            requester_id=current_user.id,
            addressee_id=req.target_user_id,
            status="pending",
        )
        db.add(new_f)

    await db.commit()
    return FriendshipActionResponse(
        success=True,
        message="Friend request sent! ✨",
        status="requested",
    )


@router.post(
    "/accept/{user_id}",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_200_OK,
)
async def accept_friend_request(
    user_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Accepts an incoming friend request from user_id.
    """
    f_stmt = select(Friendship).where(
        or_(
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_user.id),
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == user_id),
        )
    )
    res = await db.execute(f_stmt)
    friendship = res.scalars().first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No friend request found with that toon user.",
        )

    friendship.status = "accepted"
    await db.commit()
    return FriendshipActionResponse(
        success=True,
        message="Friend request accepted! 🎉",
        status="friends",
    )


@router.post(
    "/decline/{user_id}",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_200_OK,
)
async def decline_friend_request(
    user_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Declines an incoming friend request from user_id.
    """
    f_stmt = select(Friendship).where(
        Friendship.requester_id == user_id,
        Friendship.addressee_id == current_user.id,
    )
    res = await db.execute(f_stmt)
    friendship = res.scalars().first()

    if friendship:
        friendship.status = "declined"
        await db.commit()

    return FriendshipActionResponse(
        success=True,
        message="Friend request declined.",
        status="none",
    )


@router.post(
    "/cancel/{user_id}",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_200_OK,
)
async def cancel_friend_request(
    user_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Cancels a sent friend request to user_id.
    """
    f_stmt = select(Friendship).where(
        Friendship.requester_id == current_user.id,
        Friendship.addressee_id == user_id,
        Friendship.status == "pending",
    )
    res = await db.execute(f_stmt)
    friendship = res.scalars().first()

    if friendship:
        friendship.status = "canceled"
        await db.commit()

    return FriendshipActionResponse(
        success=True,
        message="Friend request canceled.",
        status="none",
    )


@router.delete(
    "/{user_id}",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_200_OK,
)
async def remove_friend(
    user_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Removes a friend.
    """
    stmt = delete(Friendship).where(
        or_(
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == user_id),
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_user.id),
        )
    )
    await db.execute(stmt)
    await db.commit()

    return FriendshipActionResponse(
        success=True,
        message="Friend removed.",
        status="none",
    )


@router.post(
    "/block/{user_id}",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_200_OK,
)
async def block_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Blocks a user and removes any existing friendship.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself!",
        )

    # Check if already blocked
    b_stmt = select(Block).where(Block.blocker_id == current_user.id, Block.blocked_id == user_id)
    b_res = await db.execute(b_stmt)
    if not b_res.scalars().first():
        db.add(Block(blocker_id=current_user.id, blocked_id=user_id))

    # Remove any friendship
    f_stmt = delete(Friendship).where(
        or_(
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == user_id),
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_user.id),
        )
    )
    await db.execute(f_stmt)
    await db.commit()

    return FriendshipActionResponse(
        success=True,
        message="User blocked.",
        status="blocked",
    )


@router.post(
    "/unblock/{user_id}",
    response_model=FriendshipActionResponse,
    status_code=status.HTTP_200_OK,
)
async def unblock_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> FriendshipActionResponse:
    """
    Unblocks a user.
    """
    stmt = delete(Block).where(Block.blocker_id == current_user.id, Block.blocked_id == user_id)
    await db.execute(stmt)
    await db.commit()

    return FriendshipActionResponse(
        success=True,
        message="User unblocked.",
        status="none",
    )

