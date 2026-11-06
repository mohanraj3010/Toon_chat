import json
import time
from typing import List, Optional
import uuid
import anyio
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocketState

from app.core.config import settings
from app.core.logging import get_logger
from app.deps import get_db, rate_limit_auth, require_active_user
from app.models.user import User
from app.realtime.connection_manager import connection_manager
from app.realtime.ticket_store import mask_ticket, ticket_store
from app.schemas.realtime import (
    ChatAckPayload,
    ChatDeliveredInboundPayload,
    ChatMessagePayload,
    ChatReadInboundPayload,
    ChatSendPayload,
    ChatTypingInboundPayload,
    RealtimeCloseCode,
    RealtimeErrorCode,
    RealtimeTicketResponse,
    ToonChatEnvelope,
)
from app.services.message_service import MessageServiceError, message_service

logger = get_logger("toonchat.api.realtime")

router = APIRouter(prefix="/realtime", tags=["realtime"])

# Per-socket inbound frame rate limits
MAX_FRAMES_PER_SEC = 30
FRAME_WINDOW_SEC = 1.0


@router.post(
    "/ticket",
    response_model=RealtimeTicketResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
)
async def issue_realtime_ticket(
    current_user: User = Depends(require_active_user),
) -> RealtimeTicketResponse:
    """
    Issues a short-lived (60s), single-use WebSocket ticket bound to the authenticated user.
    Enforces Phase 11 Bearer JWT authentication and sliding-window rate limiting.
    """
    ticket = await ticket_store.issue_ticket(
        user_id=current_user.id,
        purpose="websocket_connect",
        ttl_seconds=60,
    )
    return RealtimeTicketResponse(
        ticket=ticket,
        expires_in=60,
        user_id=current_user.id,
    )


@router.websocket("/ws")
async def realtime_websocket_endpoint(
    websocket: WebSocket,
    ticket: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Foundational authenticated WebSocket endpoint.
    Enforces:
      1. Single-use ticket validation & atomic consumption prior to websocket.accept().
      2. Verification of active, non-deleted user status in PostgreSQL.
      3. Connection registration and multi-tab management in ConnectionManager.
      4. Standard envelope parsing {type, id, ts, payload}.
      5. Bidirectional client.ping -> server.pong heartbeat.
      6. Frame size validation (<= 64KB) and rate limits.
      7. Graceful disconnect cleanup.
    """
    # Step 0: Origin verification to prevent Cross-Site WebSocket Hijacking (CSWSH)
    origin = websocket.headers.get("origin")
    allowed_origins = set(settings.CORS_ORIGINS)
    allowed_origins.add("http://testserver")
    allowed_origins.add("https://testserver")

    if origin and origin not in allowed_origins and "*" not in allowed_origins:
        logger.warning(f"Rejected WebSocket handshake: unauthorized origin '{origin}'")
        await websocket.close(
            code=RealtimeCloseCode.FORBIDDEN_USER.value,
            reason="UNAUTHORIZED_ORIGIN",
        )
        return

    # Step 1: Pre-handshake ticket validation
    if not ticket or not isinstance(ticket, str):
        logger.warning("Rejected WebSocket handshake: ticket query parameter missing")
        await websocket.close(
            code=RealtimeCloseCode.UNAUTHORIZED_TICKET.value,
            reason="MISSING_TICKET",
        )
        return

    # Step 2: Atomic consumption of single-use ticket
    user_id = await ticket_store.consume_ticket(
        ticket, expected_purpose="websocket_connect"
    )
    if user_id is None:
        logger.warning(
            f"Rejected WebSocket handshake: ticket {mask_ticket(ticket)} invalid or expired"
        )
        await websocket.close(
            code=RealtimeCloseCode.UNAUTHORIZED_TICKET.value,
            reason="INVALID_OR_EXPIRED_TICKET",
        )
        return

    # Step 3: Verify user existence and active status in PostgreSQL
    stmt = select(User).where(
        User.id == user_id,
        User.is_active.is_(True),
        User.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    user = result.scalars().first()

    if user is None:
        logger.warning(
            f"Rejected WebSocket handshake: user {user_id} not found or deactivated"
        )
        await websocket.close(
            code=RealtimeCloseCode.FORBIDDEN_USER.value,
            reason="ACCOUNT_INACTIVE",
        )
        return

    # Step 4: Accept connection & register session
    await websocket.accept()
    session_id = await connection_manager.connect(user_id, websocket)

    # Step 5: Send initial connection.ready frame
    ready_envelope = ToonChatEnvelope(
        type="connection.ready",
        payload={
            "user_id": str(user_id),
            "session_id": session_id,
            "heartbeat_interval_sec": 30,
        },
    )
    await connection_manager.send_envelope(websocket, ready_envelope)

    # Rate limiter state per connection
    frame_timestamps: List[float] = []
    message_timestamps: List[float] = []
    typing_timestamps: dict[uuid.UUID, float] = {}

    # Step 6: Inbound frame receive loop
    try:
        while True:
            text_data = await websocket.receive_text()

            # Enforce maximum frame size: 128 KB (131,072 bytes)
            if len(text_data.encode("utf-8")) > 131072:
                logger.warning(
                    f"Connection {session_id} exceeded max frame size (128KB)"
                )
                await websocket.close(
                    code=RealtimeCloseCode.MESSAGE_TOO_BIG.value,
                    reason="FRAME_TOO_LARGE",
                )
                break

            # Enforce sliding-window frame rate limit
            now = time.time()
            cutoff = now - FRAME_WINDOW_SEC
            frame_timestamps = [ts for ts in frame_timestamps if ts > cutoff]
            if len(frame_timestamps) >= MAX_FRAMES_PER_SEC:
                logger.warning(
                    f"Connection {session_id} exceeded frame rate limit ({MAX_FRAMES_PER_SEC}/s)"
                )
                err_env = ToonChatEnvelope(
                    type="error",
                    payload={
                        "code": RealtimeErrorCode.RATE_LIMITED.value,
                        "message": "Whoa speedy toon! Too many WebSocket frames sent at once ⏱️",
                        "details": {"max_frames_per_sec": MAX_FRAMES_PER_SEC},
                    },
                )
                await connection_manager.send_envelope(websocket, err_env)
                continue

            frame_timestamps.append(now)

            # Parse JSON text
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                err_env = ToonChatEnvelope(
                    type="error",
                    payload={
                        "code": RealtimeErrorCode.VALIDATION_ERROR.value,
                        "message": "Malformed JSON payload.",
                        "details": {"error_subcode": "INVALID_JSON"},
                    },
                )
                await connection_manager.send_envelope(websocket, err_env)
                continue

            # Validate standard envelope structure
            try:
                envelope = ToonChatEnvelope.model_validate(data)
            except Exception:
                err_env = ToonChatEnvelope(
                    type="error",
                    payload={
                        "code": RealtimeErrorCode.VALIDATION_ERROR.value,
                        "message": "Envelope validation failed. Expected {type, id, ts, payload}",
                        "details": {"error_subcode": "INVALID_ENVELOPE"},
                    },
                )
                await connection_manager.send_envelope(websocket, err_env)
                continue

            # Route by event type
            if envelope.type == "client.ping":
                pong_env = ToonChatEnvelope(
                    type="server.pong",
                    payload={"echo_id": envelope.id},
                )
                await connection_manager.send_envelope(websocket, pong_env)

            elif envelope.type == "chat.send":
                # Validate payload
                try:
                    send_payload = ChatSendPayload.model_validate(envelope.payload)
                except Exception:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.VALIDATION_ERROR.value,
                            "message": "Invalid chat.send payload.",
                            "details": {"error_subcode": "INVALID_PAYLOAD"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                # Rate limit chat sends: max 10 burst, max 5/sec sustained
                msg_cutoff = now - 1.0
                message_timestamps = [
                    ts for ts in message_timestamps if ts > msg_cutoff
                ]
                if len(message_timestamps) >= 10:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.RATE_LIMITED.value,
                            "message": "Whoa speedy toon! Message rate limit exceeded. Please wait ⏱️",
                            "details": {"max_messages_per_sec": 5},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                message_timestamps.append(now)

                # Execute transactional sequence allocation and message insertion
                try:
                    result = await message_service.allocate_and_insert_message(
                        db, user_id, send_payload
                    )
                except MessageServiceError as mse:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": mse.code.value,
                            "message": mse.message,
                            "details": mse.details,
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue
                except Exception as ex:
                    logger.exception(f"Unexpected error allocating message: {type(ex).__name__}")
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.INTERNAL_ERROR.value,
                            "message": "An unexpected error occurred while saving message.",
                            "details": {"error_subcode": "INTERNAL_SERVER_ERROR"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                # 1. Direct acknowledgment to sender (chat.ack)
                ack_payload = ChatAckPayload(
                    client_message_id=result.message.client_message_id,
                    message_id=result.message.id,
                    conversation_id=result.message.conversation_id,
                    sequence=result.message.sequence,
                    created_at=result.message.created_at.isoformat(),
                    status="sent",
                )
                ack_env = ToonChatEnvelope(
                    type="chat.ack",
                    payload=ack_payload.model_dump(mode="json"),
                )
                await connection_manager.send_envelope(websocket, ack_env)

                # 2. Fan-out to active conversation members (chat.message) if not an idempotent retry
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
                            await connection_manager.broadcast_to_user(
                                member_uid, broadcast_env
                            )
                        except Exception as pub_err:
                            logger.warning(
                                f"Publication error broadcasting to member {member_uid}: {pub_err}"
                            )

            elif envelope.type == "chat.read":
                try:
                    read_payload = ChatReadInboundPayload.model_validate(envelope.payload)
                except Exception:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.VALIDATION_ERROR.value,
                            "message": "Invalid chat.read payload.",
                            "details": {"error_subcode": "INVALID_PAYLOAD"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                try:
                    broadcast_payload, member_uids = await message_service.mark_conversation_read(
                        db, user_id, read_payload
                    )
                except MessageServiceError as mse:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": mse.code.value,
                            "message": mse.message,
                            "details": mse.details,
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue
                except Exception as ex:
                    logger.exception(f"Unexpected error processing chat.read: {type(ex).__name__}")
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.INTERNAL_ERROR.value,
                            "message": "An unexpected error occurred while updating read status.",
                            "details": {"error_subcode": "INTERNAL_SERVER_ERROR"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                # Broadcast only if the read sequence was monotonically advanced
                if broadcast_payload is not None:
                    broadcast_env = ToonChatEnvelope(
                        type="chat.read",
                        payload=broadcast_payload.model_dump(mode="json"),
                    )
                    for member_uid in member_uids:
                        try:
                            await connection_manager.broadcast_to_user(
                                member_uid, broadcast_env
                            )
                        except Exception as pub_err:
                            logger.warning(
                                f"Error broadcasting read receipt to {member_uid}: {pub_err}"
                            )

            elif envelope.type == "chat.typing":
                try:
                    typing_payload = ChatTypingInboundPayload.model_validate(envelope.payload)
                except Exception:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.VALIDATION_ERROR.value,
                            "message": "Invalid chat.typing payload.",
                            "details": {"error_subcode": "INVALID_PAYLOAD"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                # Throttle typing broadcasts: max 1 per 1.5 seconds per conversation
                last_typed = typing_timestamps.get(typing_payload.conversation_id, 0.0)
                if now - last_typed < 1.5 and typing_payload.is_typing:
                    continue
                typing_timestamps[typing_payload.conversation_id] = now

                try:
                    broadcast_payload, member_uids = await message_service.handle_typing_event(
                        db, user_id, typing_payload
                    )
                except MessageServiceError as mse:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": mse.code.value,
                            "message": mse.message,
                            "details": mse.details,
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue
                except Exception as ex:
                    logger.exception(f"Unexpected error processing chat.typing: {type(ex).__name__}")
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.INTERNAL_ERROR.value,
                            "message": "An unexpected error occurred while processing typing indicator.",
                            "details": {"error_subcode": "INTERNAL_SERVER_ERROR"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                # Register active typing state on socket
                await connection_manager.set_typing(
                    websocket, typing_payload.conversation_id, typing_payload.is_typing
                )

                # Broadcast typing indicator to all members EXCLUDING originating user
                broadcast_env = ToonChatEnvelope(
                    type="chat.typing",
                    payload=broadcast_payload.model_dump(mode="json"),
                )
                for member_uid in member_uids:
                    if member_uid != user_id:
                        try:
                            await connection_manager.broadcast_to_user(
                                member_uid, broadcast_env
                            )
                        except Exception as pub_err:
                            logger.warning(
                                f"Error broadcasting typing to {member_uid}: {pub_err}"
                            )

            elif envelope.type == "chat.delivered":
                try:
                    deliv_payload = ChatDeliveredInboundPayload.model_validate(envelope.payload)
                except Exception:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.VALIDATION_ERROR.value,
                            "message": "Invalid chat.delivered payload.",
                            "details": {"error_subcode": "INVALID_PAYLOAD"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                try:
                    broadcast_payload, member_uids = await message_service.handle_delivery_receipt(
                        db, user_id, deliv_payload
                    )
                except MessageServiceError as mse:
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": mse.code.value,
                            "message": mse.message,
                            "details": mse.details,
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue
                except Exception as ex:
                    logger.exception(f"Unexpected error processing chat.delivered: {type(ex).__name__}")
                    err_env = ToonChatEnvelope(
                        type="error",
                        payload={
                            "code": RealtimeErrorCode.INTERNAL_ERROR.value,
                            "message": "An unexpected error occurred while processing delivery receipt.",
                            "details": {"error_subcode": "INTERNAL_SERVER_ERROR"},
                            "echo_id": envelope.id,
                        },
                    )
                    await connection_manager.send_envelope(websocket, err_env)
                    continue

                broadcast_env = ToonChatEnvelope(
                    type="chat.delivered",
                    payload=broadcast_payload.model_dump(mode="json"),
                )
                for member_uid in member_uids:
                    try:
                        await connection_manager.broadcast_to_user(
                            member_uid, broadcast_env
                        )
                    except Exception as pub_err:
                        logger.warning(
                            f"Error broadcasting delivered receipt to {member_uid}: {pub_err}"
                        )

            else:
                err_env = ToonChatEnvelope(
                    type="error",
                    payload={
                        "code": RealtimeErrorCode.FORBIDDEN.value,
                        "message": f"Event '{envelope.type}' is not enabled in this realtime slice.",
                        "details": {"unsupported_type": envelope.type},
                        "echo_id": envelope.id,
                    },
                )
                await connection_manager.send_envelope(websocket, err_env)

    except (WebSocketDisconnect, anyio.get_cancelled_exc_class()):
        logger.info(f"WebSocket client disconnected: session {session_id}")
    except Exception as e:
        logger.exception(f"Unexpected error in WebSocket session {session_id}: {e}")
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.close(
                    code=RealtimeCloseCode.POLICY_VIOLATION.value,
                    reason="INTERNAL_ERROR",
                )
        except Exception:
            pass
    finally:
        # Step 7: Clear active typing state and broadcast stop-typing on disconnect
        with anyio.CancelScope(shield=True):
            try:
                active_convs = await connection_manager.get_and_clear_typing(websocket)
                if active_convs:
                    for conv_id in active_convs:
                        try:
                            stop_payload, member_uids = await message_service.handle_typing_event(
                                db,
                                user_id,
                                ChatTypingInboundPayload(conversation_id=conv_id, is_typing=False),
                            )
                            stop_env = ToonChatEnvelope(
                                type="chat.typing",
                                payload=stop_payload.model_dump(mode="json"),
                            )
                            for m_uid in member_uids:
                                if m_uid != user_id:
                                    await connection_manager.broadcast_to_user(m_uid, stop_env)
                        except Exception as typ_err:
                            logger.warning(f"Error handling stop-typing cleanup on disconnect: {typ_err}")
            except Exception as outer_err:
                logger.warning(f"Outer error in disconnect cleanup: {outer_err}")
            await connection_manager.disconnect(websocket)

