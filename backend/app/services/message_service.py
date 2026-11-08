import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import and_, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.core.logging import get_logger
from app.models.chat import Conversation, ConversationMember, Message
from app.models.media import Media
from app.models.social import Block
from app.models.user import User
from app.schemas.chat import ConversationMessagesResponse, MessageHistoryItem
from app.schemas.realtime import (
    ChatDeliveredBroadcastPayload,
    ChatDeliveredInboundPayload,
    ChatReadBroadcastPayload,
    ChatReadInboundPayload,
    ChatSendPayload,
    ChatTypingBroadcastPayload,
    ChatTypingInboundPayload,
    RealtimeErrorCode,
    SenderSummary,
)

logger = get_logger("toonchat.services.message")



class MessageServiceError(Exception):
    """Domain exception raised when a message operation cannot proceed."""

    def __init__(
        self,
        code: RealtimeErrorCode,
        message: str,
        details: Optional[dict] = None,
    ) -> None:
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class MessageAllocationResult:
    """Encapsulates the result of allocating and inserting a message."""

    def __init__(
        self,
        message: Message,
        sender_summary: SenderSummary,
        member_user_ids: List[uuid.UUID],
        is_retry: bool = False,
    ) -> None:
        self.message = message
        self.sender_summary = sender_summary
        self.member_user_ids = member_user_ids
        self.is_retry = is_retry


class MessageService:
    """
    Unified transactional message allocator, query, and persistence service.
    Guarantees:
      1. Ground truth in PostgreSQL.
      2. Transactional, per-conversation monotonic sequence allocation via row-locking UPDATE.
      3. Idempotent retries scoped to (sender_id, client_message_id) with canonical payload verification.
      4. Strict membership and mutual block verification on every message.
      5. Full rollback safety on aborted transactions with zero sequence leakage.
      6. Indistinguishable NOT_FOUND privacy responses for missing or foreign conversations.
      7. Bounded, index-optimized REST history queries with stable sequence ordering.
    """

    def _is_canonical_payload_match(
        self,
        existing: Message,
        payload: ChatSendPayload,
    ) -> bool:
        """
        Compares canonical message content fields to detect payload tampering or conflicts on retry.
        """
        media_url_matches = (
            payload.media_url is None
            or existing.media_url == payload.media_url
            or (payload.media_id and existing.media_url == f"/api/v1/media/{payload.media_id}/url")
        )
        return (
            existing.type == payload.type
            and existing.body == payload.body
            and existing.media_id == payload.media_id
            and media_url_matches
            and existing.reply_to_id == payload.reply_to_id
        )

    async def _is_active_member(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """
        Verifies that conversation exists, is not soft-deleted, and user is an active member.
        Enforces privacy policy: indistinguishable from non-existent conversations.
        """
        stmt = (
            select(ConversationMember.id)
            .join(Conversation, Conversation.id == ConversationMember.conversation_id)
            .where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.left_at.is_(None),
                Conversation.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        return res.scalars().first() is not None

    async def allocate_and_insert_message(
        self,
        db: AsyncSession,
        sender_id: uuid.UUID,
        payload: ChatSendPayload,
    ) -> MessageAllocationResult:
        """
        Allocates a monotonic sequence number within a database transaction,
        inserts the message row, and updates conversation metadata.
        """
        # 1. Idempotency pre-check: Return existing message if client is retrying an already committed send.
        existing_msg = await self._get_existing_by_client_msg_id(
            db, sender_id, payload.client_message_id
        )
        if existing_msg is not None:
            # DEFECT B Fix: Verify requested conversation_id matches existing record
            if existing_msg.conversation_id != payload.conversation_id:
                raise MessageServiceError(
                    code=RealtimeErrorCode.CONFLICT,
                    message="client_message_id was already used in a different conversation.",
                    details={"error_subcode": "CLIENT_MESSAGE_ID_CONFLICT"},
                )

            # DEFECT B Fix: Verify canonical payload matches original message
            if not self._is_canonical_payload_match(existing_msg, payload):
                raise MessageServiceError(
                    code=RealtimeErrorCode.CONFLICT,
                    message="client_message_id was already used with a different message payload.",
                    details={"error_subcode": "CLIENT_MESSAGE_ID_CONFLICT"},
                )

            # DEFECT C Fix: Ensure sender is still an active member using privacy policy
            is_member = await self._is_active_member(db, payload.conversation_id, sender_id)
            if not is_member:
                raise MessageServiceError(
                    code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                    message="Conversation not found or access denied.",
                    details={"error_subcode": "CONVERSATION_NOT_FOUND"},
                )

            sender_summary = await self._get_sender_summary(db, sender_id)
            member_user_ids = await self._get_active_members(db, payload.conversation_id)
            logger.info(
                f"Idempotent retry detected for client_message_id={payload.client_message_id}; returning seq={existing_msg.sequence}"
            )
            return MessageAllocationResult(
                message=existing_msg,
                sender_summary=sender_summary,
                member_user_ids=member_user_ids,
                is_retry=True,
            )

        # 2. DEFECT C Fix: Check conversation existence & active membership atomically
        is_member = await self._is_active_member(db, payload.conversation_id, sender_id)
        if not is_member:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        # 3. Retrieve conversation for direct-chat block checks
        conv_stmt = select(Conversation).where(
            Conversation.id == payload.conversation_id,
            Conversation.deleted_at.is_(None),
        )
        conv_res = await db.execute(conv_stmt)
        conversation = conv_res.scalars().first()
        if not conversation:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        member_user_ids = await self._get_active_members(db, payload.conversation_id)

        # 4. Block enforcement for direct conversations
        if conversation.type == "direct":
            other_user_id = (
                conversation.direct_user2_id
                if conversation.direct_user1_id == sender_id
                else conversation.direct_user1_id
            )
            if other_user_id:
                is_blocked = await self._check_is_blocked(
                    db, sender_id, other_user_id
                )
                if is_blocked:
                    raise MessageServiceError(
                        code=RealtimeErrorCode.FORBIDDEN,
                        message="Cannot send message: a block exists between users.",
                        details={"error_subcode": "USER_BLOCKED"},
                    )

        # 5. Validate reply_to_id if provided
        if payload.reply_to_id:
            reply_stmt = select(Message.id).where(
                Message.id == payload.reply_to_id,
                Message.conversation_id == payload.conversation_id,
                Message.is_deleted.is_(False),
            )
            reply_res = await db.execute(reply_stmt)
            if not reply_res.scalars().first():
                raise MessageServiceError(
                    code=RealtimeErrorCode.VALIDATION_ERROR,
                    message="Quoted message not found in this conversation.",
                    details={"error_subcode": "INVALID_REPLY_TO"},
                )

        # 5b. Validate media_id and enforce message type / media type compatibility
        resolved_media_url = None
        if payload.type in ("image", "file", "voice") and not payload.media_id:
            raise MessageServiceError(
                code=RealtimeErrorCode.VALIDATION_ERROR,
                message=f"Messages of type '{payload.type}' require a confirmed media_id.",
                details={"error_subcode": "MEDIA_ID_REQUIRED"},
            )

        if payload.media_id:
            media_stmt = select(Media).where(Media.id == payload.media_id)
            media_res = await db.execute(media_stmt)
            media_record = media_res.scalars().first()
            if not media_record or media_record.status != "ready":
                raise MessageServiceError(
                    code=RealtimeErrorCode.VALIDATION_ERROR,
                    message="Attached media item not found or not ready for sending.",
                    details={"error_subcode": "MEDIA_NOT_READY"},
                )
            if media_record.uploader_id != sender_id:
                raise MessageServiceError(
                    code=RealtimeErrorCode.FORBIDDEN,
                    message="Cannot attach media uploaded by another user.",
                    details={"error_subcode": "MEDIA_NOT_OWNED"},
                )

            # Enforce strict type compatibility
            if payload.type in ("image", "file", "voice") and media_record.media_type != payload.type:
                raise MessageServiceError(
                    code=RealtimeErrorCode.VALIDATION_ERROR,
                    message=f"Message type '{payload.type}' does not match media type '{media_record.media_type}'.",
                    details={"error_subcode": "MEDIA_TYPE_MISMATCH"},
                )

            # Enforce cross-conversation isolation: media cannot be attached to a different conversation
            cross_attach_stmt = select(Message.id).where(
                Message.media_id == payload.media_id,
                Message.conversation_id != payload.conversation_id,
                Message.is_deleted.is_(False),
            )
            cross_attach_res = await db.execute(cross_attach_stmt)
            if cross_attach_res.scalars().first():
                raise MessageServiceError(
                    code=RealtimeErrorCode.FORBIDDEN,
                    message="Cannot attach media that is already attached to another conversation.",
                    details={"error_subcode": "MEDIA_ALREADY_ATTACHED"},
                )

            # Never trust client-provided media_url; resolve authoritatively from media ID
            resolved_media_url = f"/api/v1/media/{media_record.id}/url"

        # 6. Transactional Per-Conversation Monotonic Sequence Allocation:
        now = datetime.now(timezone.utc)
        new_msg_id = uuid.uuid4()

        try:
            # 6a. Allocate monotonic sequence number first (locks the conversation row)
            # Notice: last_message_id is NOT updated here to prevent foreign key violation fk_conversations_last_message
            seq_stmt = (
                update(Conversation)
                .where(
                    Conversation.id == payload.conversation_id,
                    Conversation.deleted_at.is_(None),
                )
                .values(
                    message_seq_counter=Conversation.message_seq_counter + 1,
                )
                .returning(Conversation.message_seq_counter)
            )
            seq_res = await db.execute(seq_stmt)
            new_seq = seq_res.scalar_one_or_none()
            if new_seq is None:
                raise MessageServiceError(
                    code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                    message="Conversation not found or access denied.",
                    details={"error_subcode": "CONVERSATION_NOT_FOUND"},
                )

            # 6b. Insert message row FIRST so foreign key constraint fk_conversations_last_message is satisfied
            new_message = Message(
                id=new_msg_id,
                conversation_id=payload.conversation_id,
                sender_id=sender_id,
                sequence=new_seq,
                client_message_id=payload.client_message_id,
                type=payload.type,
                body=payload.body,
                media_id=payload.media_id,
                media_url=resolved_media_url,
                reply_to_id=payload.reply_to_id,
                is_edited=False,
                is_deleted=False,
                created_at=now,
                updated_at=now,
            )
            db.add(new_message)
            await db.flush()

            # 6c. Update conversation's last_message_id and timestamps SECOND now that message row exists
            update_last_msg_stmt = (
                update(Conversation)
                .where(
                    Conversation.id == payload.conversation_id,
                    Conversation.deleted_at.is_(None),
                )
                .values(
                    last_message_id=new_msg_id,
                    last_message_at=now,
                    updated_at=now,
                )
            )
            await db.execute(update_last_msg_stmt)

            await db.commit()
            await db.refresh(new_message)
        except IntegrityError as ie:
            await db.rollback()
            logger.exception(f"[MessageService] Database integrity conflict on message commit: {ie}")
            # DEFECT B Fix: Handle concurrent race on (sender_id, client_message_id)
            existing_retry = await self._get_existing_by_client_msg_id(
                db, sender_id, payload.client_message_id
            )
            if existing_retry:
                # Re-verify conversation_id matches
                if existing_retry.conversation_id != payload.conversation_id:
                    raise MessageServiceError(
                        code=RealtimeErrorCode.CONFLICT,
                        message="client_message_id was already used in a different conversation.",
                        details={"error_subcode": "CLIENT_MESSAGE_ID_CONFLICT"},
                    )
                # Re-verify canonical payload matches
                if not self._is_canonical_payload_match(existing_retry, payload):
                    raise MessageServiceError(
                        code=RealtimeErrorCode.CONFLICT,
                        message="client_message_id was already used with a different message payload.",
                        details={"error_subcode": "CLIENT_MESSAGE_ID_CONFLICT"},
                    )
                # Re-verify sender is still active member
                is_member = await self._is_active_member(db, payload.conversation_id, sender_id)
                if not is_member:
                    raise MessageServiceError(
                        code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                        message="Conversation not found or access denied.",
                        details={"error_subcode": "CONVERSATION_NOT_FOUND"},
                    )
                sender_summary = await self._get_sender_summary(db, sender_id)
                member_user_ids = await self._get_active_members(db, payload.conversation_id)
                return MessageAllocationResult(
                    message=existing_retry,
                    sender_summary=sender_summary,
                    member_user_ids=member_user_ids,
                    is_retry=True,
                )

            logger.error(f"[MessageService] Unrecoverable database integrity error: {ie}")
            raise MessageServiceError(
                code=RealtimeErrorCode.CONFLICT,
                message="Database integrity conflict during message insertion.",
                details={"error_subcode": "INTEGRITY_CONFLICT", "error": str(ie)},
            )
        except MessageServiceError:
            await db.rollback()
            raise
        except Exception as ex:
            await db.rollback()
            logger.exception(f"[MessageService] Unexpected database error on message commit: {ex}")
            raise

        sender_summary = await self._get_sender_summary(db, sender_id)
        return MessageAllocationResult(
            message=new_message,
            sender_summary=sender_summary,
            member_user_ids=member_user_ids,
            is_retry=False,
        )

    async def get_conversation_messages(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        after_seq: Optional[int] = None,
        before_seq: Optional[int] = None,
        limit: int = 50,
    ) -> ConversationMessagesResponse:
        """
        Retrieves a paginated window of messages for a conversation.
        Enforces strict active membership authorization and privacy semantics.
        Excludes soft-deleted messages.
        Returns messages in stable chronological order (sequence ASC).
        """
        # 1. Authorization: Verify conversation exists and user is active member
        is_member = await self._is_active_member(db, conversation_id, user_id)
        if not is_member:
            raise NotFoundError(message="Conversation not found or access denied.")

        # 2. Build index-friendly query utilizing ix_messages_pagination (conversation_id, sequence.desc())
        stmt = (
            select(Message)
            .options(selectinload(Message.sender).selectinload(User.profile))
            .where(
                Message.conversation_id == conversation_id,
                Message.is_deleted.is_(False),
            )
        )

        if after_seq is not None and before_seq is not None:
            # Bounded window catch-up
            stmt = stmt.where(
                Message.sequence > after_seq,
                Message.sequence < before_seq,
            ).order_by(Message.sequence.asc()).limit(limit + 1)
            order_mode = "asc"
        elif after_seq is not None:
            # Reconnect catch-up forward
            stmt = stmt.where(
                Message.sequence > after_seq
            ).order_by(Message.sequence.asc()).limit(limit + 1)
            order_mode = "asc"
        elif before_seq is not None:
            # Pagination backward for older messages
            stmt = stmt.where(
                Message.sequence < before_seq
            ).order_by(Message.sequence.desc()).limit(limit + 1)
            order_mode = "desc"
        else:
            # Default: most recent messages
            stmt = stmt.order_by(Message.sequence.desc()).limit(limit + 1)
            order_mode = "desc"

        res = await db.execute(stmt)
        messages = list(res.scalars().all())

        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        if order_mode == "desc":
            # Return ascending order so consumer renders timelines chronologically
            messages.reverse()

        items: List[MessageHistoryItem] = []
        for m in messages:
            sender_summary = None
            if m.sender:
                display_name = (
                    m.sender.profile.display_name
                    if m.sender.profile and m.sender.profile.display_name
                    else m.sender.username
                )
                avatar_url = (
                    m.sender.profile.avatar_url if m.sender.profile else None
                )
                sender_summary = SenderSummary(
                    id=m.sender.id,
                    username=m.sender.username,
                    display_name=display_name,
                    avatar_url=avatar_url,
                )

            items.append(
                MessageHistoryItem(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    sequence=m.sequence,
                    sender_id=m.sender_id,
                    client_message_id=m.client_message_id,
                    type=m.type,
                    body=m.body,
                    media_id=m.media_id,
                    media_url=m.media_url,
                    reply_to_id=m.reply_to_id,
                    is_edited=m.is_edited,
                    created_at=m.created_at,
                    sender=sender_summary,
                )
            )

        oldest_seq = items[0].sequence if items else None
        latest_seq = items[-1].sequence if items else None

        return ConversationMessagesResponse(
            conversation_id=conversation_id,
            messages=items,
            has_more=has_more,
            oldest_seq=oldest_seq,
            latest_seq=latest_seq,
            count=len(items),
        )

    async def mark_conversation_read(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        payload: ChatReadInboundPayload,
    ) -> Tuple[Optional[ChatReadBroadcastPayload], List[uuid.UUID]]:
        """
        Advances the member's last_read_seq monotonically in PostgreSQL.
        Guarantees:
          - Actor strictly bound to authenticated user_id.
          - Rejects negative or zero sequences (validated by Field(ge=1)).
          - Rejects future sequences exceeding conversation's message_seq_counter.
          - Monotonic progress: atomic update with last_read_seq < :new_seq prevents backwards movement.
          - Indistinguishable NOT_FOUND privacy responses for missing or non-member conversations.
          - Returns broadcast payload only if cursor was actually advanced.
        """
        # 1. Authorization: Verify active membership and conversation active status
        is_member = await self._is_active_member(db, payload.conversation_id, user_id)
        if not is_member:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        # 2. Check maximum sequence currently allocated in conversation
        conv_stmt = select(Conversation.message_seq_counter).where(
            Conversation.id == payload.conversation_id,
            Conversation.deleted_at.is_(None),
        )
        conv_res = await db.execute(conv_stmt)
        max_seq = conv_res.scalar_one_or_none()
        if max_seq is None:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        if payload.sequence > max_seq:
            raise MessageServiceError(
                code=RealtimeErrorCode.VALIDATION_ERROR,
                message=f"Read sequence {payload.sequence} cannot exceed latest conversation sequence {max_seq}.",
                details={"error_subcode": "FUTURE_SEQUENCE"},
            )

        # 3. Monotonic update on conversation_members
        now = datetime.now(timezone.utc)
        update_stmt = (
            update(ConversationMember)
            .where(
                ConversationMember.conversation_id == payload.conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.left_at.is_(None),
                ConversationMember.last_read_seq < payload.sequence,
            )
            .values(
                last_read_seq=payload.sequence,
                last_read_at=now,
            )
            .returning(ConversationMember.last_read_seq)
        )
        update_res = await db.execute(update_stmt)
        new_read_seq = update_res.scalar_one_or_none()
        await db.commit()

        member_user_ids = await self._get_active_members(db, payload.conversation_id)

        if new_read_seq is None:
            # Stale or duplicate read request; cursor was already >= sequence
            return None, member_user_ids

        broadcast_payload = ChatReadBroadcastPayload(
            conversation_id=payload.conversation_id,
            user_id=user_id,
            last_read_seq=new_read_seq,
            read_at=now.isoformat(),
        )
        return broadcast_payload, member_user_ids

    async def handle_typing_event(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        payload: ChatTypingInboundPayload,
    ) -> Tuple[ChatTypingBroadcastPayload, List[uuid.UUID]]:
        """
        Validates typing event and returns ephemeral broadcast payload.
        Guarantees:
          - Ephemeral only (not persisted to messages table).
          - Requires active conversation membership.
          - Enforces block rules for direct conversations.
          - Server-generated timestamps and 5-second expiration.
          - Returns active conversation member IDs for targeted fanout.
        """
        # 1. Authorization: Verify active membership and conversation active status
        is_member = await self._is_active_member(db, payload.conversation_id, user_id)
        if not is_member:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        # 2. Block enforcement for direct conversations
        conv_stmt = select(Conversation).where(
            Conversation.id == payload.conversation_id,
            Conversation.deleted_at.is_(None),
        )
        conv_res = await db.execute(conv_stmt)
        conversation = conv_res.scalars().first()
        if not conversation:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        if conversation.type == "direct":
            other_user_id = (
                conversation.direct_user2_id
                if conversation.direct_user1_id == user_id
                else conversation.direct_user1_id
            )
            if other_user_id:
                is_blocked = await self._check_is_blocked(db, user_id, other_user_id)
                if is_blocked:
                    raise MessageServiceError(
                        code=RealtimeErrorCode.FORBIDDEN,
                        message="Cannot broadcast typing indicator: a block exists between users.",
                        details={"error_subcode": "USER_BLOCKED"},
                    )

        # 3. Build broadcast payload
        sender_summary = await self._get_sender_summary(db, user_id)
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(seconds=5)).isoformat() if payload.is_typing else None

        broadcast_payload = ChatTypingBroadcastPayload(
            conversation_id=payload.conversation_id,
            user_id=user_id,
            username=sender_summary.username,
            display_name=sender_summary.display_name,
            is_typing=payload.is_typing,
            expires_at=expires_at,
        )
        member_user_ids = await self._get_active_members(db, payload.conversation_id)
        return broadcast_payload, member_user_ids

    async def handle_delivery_receipt(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        payload: ChatDeliveredInboundPayload,
    ) -> Tuple[ChatDeliveredBroadcastPayload, List[uuid.UUID]]:
        """
        Processes client-observed delivery acknowledgement.
        Guarantees:
          - Ephemeral recipient delivery acknowledgement (not durable DB status).
          - Requires active conversation membership.
          - Rejects delivery receipts emitted by sender for their own messages.
          - Validates message existence, matching conversation, and sequence.
        """
        # 1. Authorization: Verify active membership
        is_member = await self._is_active_member(db, payload.conversation_id, user_id)
        if not is_member:
            raise MessageServiceError(
                code=RealtimeErrorCode.RESOURCE_NOT_FOUND,
                message="Conversation not found or access denied.",
                details={"error_subcode": "CONVERSATION_NOT_FOUND"},
            )

        # 2. Verify message exists and actor is NOT the sender
        stmt = select(Message.id, Message.sender_id).where(
            Message.id == payload.message_id,
            Message.conversation_id == payload.conversation_id,
            Message.sequence == payload.sequence,
            Message.is_deleted.is_(False),
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            raise MessageServiceError(
                code=RealtimeErrorCode.VALIDATION_ERROR,
                message="Message not found in this conversation.",
                details={"error_subcode": "MESSAGE_NOT_FOUND"},
            )

        msg_id, sender_id = row
        if sender_id == user_id:
            raise MessageServiceError(
                code=RealtimeErrorCode.VALIDATION_ERROR,
                message="Recipient cannot emit delivery receipts for their own sent messages.",
                details={"error_subcode": "CANNOT_DELIVER_OWN_MESSAGE"},
            )

        now = datetime.now(timezone.utc)
        broadcast_payload = ChatDeliveredBroadcastPayload(
            conversation_id=payload.conversation_id,
            message_id=payload.message_id,
            sequence=payload.sequence,
            user_id=user_id,
            delivered_at=now.isoformat(),
        )
        member_user_ids = await self._get_active_members(db, payload.conversation_id)
        return broadcast_payload, member_user_ids

    async def _get_existing_by_client_msg_id(
        self,
        db: AsyncSession,
        sender_id: uuid.UUID,
        client_message_id: str,
    ) -> Optional[Message]:
        stmt = select(Message).where(
            Message.sender_id == sender_id,
            Message.client_message_id == client_message_id,
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def _get_active_members(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
    ) -> List[uuid.UUID]:
        stmt = select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.left_at.is_(None),
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def _check_is_blocked(
        self,
        db: AsyncSession,
        user1_id: uuid.UUID,
        user2_id: uuid.UUID,
    ) -> bool:
        stmt = select(Block.id).where(
            or_(
                and_(Block.blocker_id == user1_id, Block.blocked_id == user2_id),
                and_(Block.blocker_id == user2_id, Block.blocked_id == user1_id),
            )
        )
        res = await db.execute(stmt)
        return res.scalars().first() is not None

    async def _get_sender_summary(
        self,
        db: AsyncSession,
        sender_id: uuid.UUID,
    ) -> SenderSummary:
        stmt = (
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == sender_id)
        )
        res = await db.execute(stmt)
        user = res.scalars().first()
        if not user:
            return SenderSummary(
                id=sender_id,
                username="unknown_toon",
                display_name="Unknown Toon",
                avatar_url=None,
            )

        display_name = (
            user.profile.display_name
            if user.profile and user.profile.display_name
            else user.username
        )
        avatar_url = user.profile.avatar_url if user.profile else None

        return SenderSummary(
            id=user.id,
            username=user.username,
            display_name=display_name,
            avatar_url=avatar_url,
        )


# Global service instance
message_service = MessageService()
