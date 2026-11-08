import uuid
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.core.errors import BadRequestError, NotFoundError
from app.core.logging import get_logger
from app.deps import get_current_user, get_db, require_active_user
from app.models.chat import Conversation, ConversationMember, Message
from app.models.social import Block
from app.models.user import User
from app.realtime.connection_manager import connection_manager
from app.schemas.chat import (
    ConversationCreateRequest,
    ConversationLastMessage,
    ConversationMessagesResponse,
    ConversationParticipant,
    ConversationSummaryResponse,
)
from app.schemas.realtime import (
    ChatAckPayload,
    ChatMessagePayload,
    ChatSendPayload,
    RealtimeErrorCode,
    ToonChatEnvelope,
)
from app.services.auth_service import AuthService
from app.services.message_service import MessageServiceError, message_service

logger = get_logger("toonchat.api.conversations")

router = APIRouter(prefix="/conversations", tags=["conversations"])


def build_conversation_summary(
    conv: Conversation,
    current_user_id: uuid.UUID,
    my_member: Optional[ConversationMember] = None,
    last_msg: Optional[Message] = None,
) -> ConversationSummaryResponse:
    if my_member is None:
        for m in conv.members:
            if m.user_id == current_user_id and m.left_at is None:
                my_member = m
                break

    participants: List[ConversationParticipant] = []
    other_participant: Optional[ConversationParticipant] = None

    for m in conv.members:
        if m.left_at is not None:
            continue
        u = m.user
        prof = u.profile if u else None
        p = ConversationParticipant(
            id=u.id if u else m.user_id,
            username=u.username if u else "user",
            display_name=prof.display_name if prof else (u.username if u else "User"),
            avatar_url=prof.avatar_url if prof else None,
            status=prof.status if prof else "offline",
            vibe_text=prof.vibe_text if prof else None,
            theme_base=prof.character_base if prof else 1,
        )
        participants.append(p)
        if p.id != current_user_id and other_participant is None:
            other_participant = p

    last_read_seq = my_member.last_read_seq if my_member else 0
    is_pinned = my_member.is_pinned if my_member else False
    is_muted = my_member.is_muted if my_member else False
    unread_count = max(0, conv.message_seq_counter - last_read_seq)

    if conv.type == "direct":
        if other_participant:
            name = other_participant.display_name
            title = other_participant.display_name
            theme_base = other_participant.theme_base
            avatar_url = other_participant.avatar_url
        else:
            name = conv.title or "Direct Chat"
            title = name
            theme_base = 1
            avatar_url = None
    else:
        name = conv.group.name if conv.group else (conv.title or "Cartoon Squad")
        title = name
        theme_base = 7
        avatar_url = conv.avatar_url

    last_message_summary = None
    if last_msg:
        last_message_summary = ConversationLastMessage(
            id=last_msg.id,
            conversation_id=last_msg.conversation_id,
            sender_id=last_msg.sender_id,
            sequence=last_msg.sequence,
            content=last_msg.body,
            type=last_msg.type,
            created_at=last_msg.created_at,
        )

    updated_at = conv.last_message_at or conv.updated_at or conv.created_at

    return ConversationSummaryResponse(
        id=conv.id,
        type=conv.type,
        title=title,
        name=name,
        avatar_url=avatar_url,
        theme_base=theme_base,
        unread_count=unread_count,
        is_pinned=is_pinned,
        is_muted=is_muted,
        is_typing=False,
        updated_at=updated_at,
        participants=participants,
        last_message=last_message_summary,
    )


@router.get(
    "",
    response_model=List[ConversationSummaryResponse],
    status_code=status.HTTP_200_OK,
)
@router.get(
    "/",
    response_model=List[ConversationSummaryResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_conversations(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationSummaryResponse]:
    """
    Returns all active conversations for the authenticated user,
    ordered by pinned status and latest activity.
    """
    stmt = (
        select(ConversationMember)
        .join(Conversation, Conversation.id == ConversationMember.conversation_id)
        .where(
            ConversationMember.user_id == current_user.id,
            ConversationMember.left_at.is_(None),
            Conversation.deleted_at.is_(None),
        )
        .options(
            selectinload(ConversationMember.conversation)
            .selectinload(Conversation.members)
            .selectinload(ConversationMember.user)
            .selectinload(User.profile),
            selectinload(ConversationMember.conversation)
            .selectinload(Conversation.group),
        )
    )
    res = await db.execute(stmt)
    my_memberships = res.scalars().all()

    if not my_memberships:
        return []

    # Batch query last messages
    last_msg_ids = [
        cm.conversation.last_message_id
        for cm in my_memberships
        if cm.conversation.last_message_id
    ]
    msgs_by_id: Dict[uuid.UUID, Message] = {}
    if last_msg_ids:
        msg_stmt = select(Message).where(
            Message.id.in_(last_msg_ids),
            Message.is_deleted.is_(False),
        )
        msg_res = await db.execute(msg_stmt)
        msgs_by_id = {m.id: m for m in msg_res.scalars().all()}

    summaries: List[ConversationSummaryResponse] = []
    for cm in my_memberships:
        conv = cm.conversation
        last_msg = msgs_by_id.get(conv.last_message_id) if conv.last_message_id else None
        summary = build_conversation_summary(
            conv=conv,
            current_user_id=current_user.id,
            my_member=cm,
            last_msg=last_msg,
        )
        summaries.append(summary)

    # Sort pinned first, then by updated_at descending
    summaries.sort(
        key=lambda s: (s.is_pinned, s.updated_at),
        reverse=True,
    )
    return summaries


@router.post(
    "",
    response_model=ConversationSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=ConversationSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_or_get_direct_conversation(
    req: ConversationCreateRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationSummaryResponse:
    """
    Creates or retrieves an active direct 1-on-1 conversation with the target user.
    Enforces canonical unordered pair indexing, privacy block checks, and participant membership.
    """
    if req.target_user_id == current_user.id:
        raise BadRequestError(message="Cannot start a conversation with yourself.")

    target_user = await AuthService.get_user_by_id(db, req.target_user_id)
    if not target_user or not target_user.is_active:
        raise NotFoundError(message="User not found or account is inactive.")

    # Mutual block check
    block_stmt = select(Block).where(
        or_(
            and_(Block.blocker_id == current_user.id, Block.blocked_id == req.target_user_id),
            and_(Block.blocker_id == req.target_user_id, Block.blocked_id == current_user.id),
        )
    )
    block_res = await db.execute(block_stmt)
    if block_res.scalars().first() is not None:
        raise BadRequestError(message="Cannot start conversation due to privacy/blocking settings.")

    u1 = min(current_user.id, req.target_user_id)
    u2 = max(current_user.id, req.target_user_id)

    # Check if conversation already exists
    conv_stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.members)
            .selectinload(ConversationMember.user)
            .selectinload(User.profile),
            selectinload(Conversation.group),
        )
        .where(
            Conversation.type == "direct",
            Conversation.direct_user1_id == u1,
            Conversation.direct_user2_id == u2,
            Conversation.deleted_at.is_(None),
        )
    )
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalars().first()

    if conv is not None:
        # Verify or restore memberships
        member_map = {m.user_id: m for m in conv.members}
        needs_commit = False
        for uid in (current_user.id, req.target_user_id):
            if uid not in member_map:
                new_m = ConversationMember(
                    conversation_id=conv.id,
                    user_id=uid,
                    role="member",
                )
                db.add(new_m)
                conv.members.append(new_m)
                needs_commit = True
            elif member_map[uid].left_at is not None:
                member_map[uid].left_at = None
                needs_commit = True

        if needs_commit:
            await db.commit()

        # Fetch last message if exists
        last_msg = None
        if conv.last_message_id:
            m_res = await db.execute(
                select(Message).where(Message.id == conv.last_message_id, Message.is_deleted.is_(False))
            )
            last_msg = m_res.scalars().first()

        return build_conversation_summary(
            conv=conv,
            current_user_id=current_user.id,
            last_msg=last_msg,
        )

    # Create new direct conversation
    new_conv_id = uuid.uuid4()
    conv = Conversation(
        id=new_conv_id,
        type="direct",
        direct_user1_id=u1,
        direct_user2_id=u2,
        message_seq_counter=0,
    )
    db.add(conv)
    await db.flush()

    m1 = ConversationMember(
        conversation_id=conv.id,
        user_id=current_user.id,
        role="member",
    )
    m2 = ConversationMember(
        conversation_id=conv.id,
        user_id=req.target_user_id,
        role="member",
    )
    db.add_all([m1, m2])
    await db.commit()

    # Reload with relations
    reload_stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.members)
            .selectinload(ConversationMember.user)
            .selectinload(User.profile),
            selectinload(Conversation.group),
        )
        .where(Conversation.id == new_conv_id)
    )
    reload_res = await db.execute(reload_stmt)
    created_conv = reload_res.scalars().first()

    return build_conversation_summary(
        conv=created_conv,
        current_user_id=current_user.id,
        last_msg=None,
    )


@router.get(
    "/{conversation_id}/messages",
    response_model=ConversationMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    after_seq: Optional[int] = Query(
        None,
        ge=0,
        description="Exclusive lower-bound sequence for reconnect catch-up (returns messages where sequence > after_seq).",
    ),
    before_seq: Optional[int] = Query(
        None,
        ge=1,
        description="Exclusive upper-bound sequence for older history pagination (returns messages where sequence < before_seq).",
    ),
    limit: int = Query(
        50,
        ge=1,
        le=100,
        description="Maximum number of messages to return per page (min 1, max 100, default 50).",
    ),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationMessagesResponse:
    """
    Authenticated REST history endpoint for catch-up recovery and chronological message paging.
    Enforces active conversation membership and privacy semantics (returns 404 for foreign or non-existent conversations).
    Excludes soft-deleted messages.
    """
    if after_seq is not None and before_seq is not None:
        if after_seq >= before_seq:
            raise BadRequestError(
                message="Invalid sequence bounds: after_seq must be strictly less than before_seq."
            )

    return await message_service.get_conversation_messages(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        after_seq=after_seq,
        before_seq=before_seq,
        limit=limit,
    )


class MessageCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    client_message_id: Optional[str] = Field(None, max_length=128)
    client_msg_id: Optional[str] = Field(None, max_length=128)
    body: Optional[str] = Field(None, max_length=65535)
    content: Optional[str] = Field(None, max_length=65535)
    type: str = Field("text", min_length=1, max_length=20)
    media_id: Optional[uuid.UUID] = None
    media_url: Optional[str] = None
    reply_to_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def populate_aliases(self) -> "MessageCreateRequest":
        eff_id = self.client_message_id or self.client_msg_id
        if not eff_id:
            raise ValueError("client_message_id or client_msg_id is required")
        self.client_message_id = eff_id
        self.client_msg_id = eff_id

        eff_body = self.body or self.content
        if not eff_body:
            raise ValueError("body or content is required")
        self.body = eff_body
        self.content = eff_body
        return self


@router.post(
    "/{conversation_id}/messages",
    response_model=ChatAckPayload,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/{conversation_id}/messages/",
    response_model=ChatAckPayload,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def send_conversation_message(
    conversation_id: uuid.UUID,
    req: MessageCreateRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ChatAckPayload:
    """
    Authoritative REST message creation endpoint.
    Performs monotonic sequence allocation, transactional database insertion,
    conversation metadata update, and realtime WebSocket fan-out to participants.
    """
    try:
        logger.info(
            f"[REST sendMessage] Processing send for conversation={conversation_id}, "
            f"user={current_user.id}, client_message_id={req.client_message_id}"
        )
        send_payload = ChatSendPayload(
            conversation_id=conversation_id,
            client_message_id=req.client_message_id,
            client_msg_id=req.client_message_id,
            type=req.type,
            body=req.body,
            content=req.body,
            media_id=req.media_id,
            media_url=req.media_url,
            reply_to_id=req.reply_to_id,
        )

        result = await message_service.allocate_and_insert_message(
            db=db,
            sender_id=current_user.id,
            payload=send_payload,
        )
    except MessageServiceError as mse:
        logger.error(
            f"[REST sendMessage] MessageServiceError: code={mse.code.value}, "
            f"message={mse.message}, details={mse.details}"
        )
        status_code = status.HTTP_400_BAD_REQUEST
        if mse.code == RealtimeErrorCode.RESOURCE_NOT_FOUND:
            status_code = status.HTTP_404_NOT_FOUND
        elif mse.code in (RealtimeErrorCode.FORBIDDEN, RealtimeErrorCode.USER_BLOCKED):
            status_code = status.HTTP_403_FORBIDDEN
        elif mse.code == RealtimeErrorCode.CONFLICT:
            status_code = status.HTTP_409_CONFLICT
        raise HTTPException(
            status_code=status_code,
            detail={"code": mse.code.value, "message": mse.message, "details": mse.details},
        )
    except Exception as exc:
        logger.exception(f"[REST sendMessage] Unhandled database/server error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while saving message: {str(exc)}",
        )

    if not result.is_retry:
        broadcast_payload = ChatMessagePayload(
            id=result.message.id,
            conversation_id=result.message.conversation_id,
            sender_id=result.message.sender_id,
            sequence=result.message.sequence,
            client_message_id=result.message.client_message_id,
            type=result.message.type,
            body=result.message.body,
            media_id=result.message.media_id,
            media_url=result.message.media_url,
            reply_to_id=result.message.reply_to_id,
            created_at=result.message.created_at.isoformat(),
            sender=result.sender_summary,
        )
        broadcast_env = ToonChatEnvelope(
            type="chat.message",
            payload=broadcast_payload.model_dump(mode="json"),
        )
        for member_uid in result.member_user_ids:
            try:
                await connection_manager.broadcast_to_user(member_uid, broadcast_env)
            except Exception as b_err:
                logger.warning(f"Error broadcasting message to member {member_uid}: {b_err}")

    return ChatAckPayload(
        client_message_id=result.message.client_message_id,
        client_msg_id=result.message.client_message_id,
        message_id=result.message.id,
        conversation_id=result.message.conversation_id,
        sequence=result.message.sequence,
        created_at=result.message.created_at.isoformat(),
        status="sent",
    )
