import asyncio
from datetime import datetime, timezone
from typing import Generator
import uuid
import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from starlette.testclient import TestClient

from app.core.config import settings
from app.deps import get_db
from app.main import app
from app.models.chat import Conversation, ConversationMember, Message
from app.models.social import Block
from app.schemas.realtime import (
    ChatReadInboundPayload,
    RealtimeErrorCode,
)
from app.services.message_service import MessageServiceError, message_service
from tests.test_auth import create_mock_supabase_token


@pytest.fixture(autouse=True)
def setup_jwt_secret(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")


def get_test_session_factory():
    test_engine = create_async_engine(
        settings.effective_database_url,
        poolclass=NullPool,
    )
    return async_sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=AsyncSession,
    )


@pytest.fixture
def ws_client() -> Generator[TestClient, None, None]:
    test_session_factory = get_test_session_factory()

    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.pop(get_db, None)


def register_user(client: TestClient, prefix: str) -> dict:
    uid = str(uuid.uuid4())
    unique_email = f"{prefix}_{uuid.uuid4().hex[:6]}@toonchat.dev"
    token = create_mock_supabase_token(uid, unique_email)
    payload = {
        "username": f"{prefix}_{uuid.uuid4().hex[:6]}",
        "displayName": f"User {prefix.capitalize()}",
        "email": unique_email,
        "characterBase": 1,
    }
    res = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201, f"User registration failed: {res.text}"
    return {"user_id": uid, "token": token, "payload": payload}


async def seed_conversation_with_messages(
    user1_id: uuid.UUID,
    user2_id: uuid.UUID,
    message_count: int = 5,
) -> uuid.UUID:
    session_factory = get_test_session_factory()
    now = datetime.now(timezone.utc)
    conv_id = uuid.uuid4()

    async with session_factory() as session:
        conv = Conversation(
            id=conv_id,
            type="direct",
            direct_user1_id=min(user1_id, user2_id),
            direct_user2_id=max(user1_id, user2_id),
            message_seq_counter=message_count,
            created_at=now,
            updated_at=now,
        )
        session.add(conv)
        await session.flush()

        m1 = ConversationMember(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            user_id=user1_id,
            role="member",
            last_read_seq=0,
            joined_at=now,
        )
        m2 = ConversationMember(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            user_id=user2_id,
            role="member",
            last_read_seq=0,
            joined_at=now,
        )
        session.add_all([m1, m2])

        messages = []
        for i in range(1, message_count + 1):
            sender = user1_id if i % 2 == 1 else user2_id
            msg = Message(
                id=uuid.uuid4(),
                conversation_id=conv_id,
                sender_id=sender,
                sequence=i,
                client_message_id=f"cmsg_seed_{conv_id}_{i}",
                type="text",
                body=f"Test message body {i}",
                is_edited=False,
                is_deleted=False,
                created_at=now,
                updated_at=now,
            )
            messages.append(msg)

        session.add_all(messages)
        await session.commit()
        return conv_id


# ---------------------------------------------------------------------------
# 1. Read Receipt Tests
# ---------------------------------------------------------------------------

def test_valid_read_receipt(ws_client: TestClient):
    alice = register_user(ws_client, "rd_a")
    bob = register_user(ws_client, "rd_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=3))

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]
    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()  # connection.ready
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
            ws_bob.receive_json()  # connection.ready

            # Alice sends chat.read with sequence 2
            ws_alice.send_json({
                "type": "chat.read",
                "id": "read_req_1",
                "payload": {
                    "conversation_id": str(conv_id),
                    "sequence": 2,
                },
            })

            # Bob receives broadcast of Alice's read receipt
            bob_frame = ws_bob.receive_json()
            assert bob_frame["type"] == "chat.read"
            assert bob_frame["payload"]["conversation_id"] == str(conv_id)
            assert bob_frame["payload"]["user_id"] == str(alice_id)
            assert bob_frame["payload"]["last_read_seq"] == 2

            # Alice also receives multi-tab synchronization broadcast
            alice_frame = ws_alice.receive_json()
            assert alice_frame["type"] == "chat.read"
            assert alice_frame["payload"]["last_read_seq"] == 2

    # Verify database cursor is persisted
    session_factory = get_test_session_factory()

    async def verify_cursor():
        async with session_factory() as session:
            stmt = select(ConversationMember.last_read_seq).where(
                ConversationMember.conversation_id == conv_id,
                ConversationMember.user_id == alice_id,
            )
            res = await session.execute(stmt)
            return res.scalar_one()

    assert asyncio.run(verify_cursor()) == 2


def test_unauthorized_and_non_member_read_receipt(ws_client: TestClient):
    alice = register_user(client=ws_client, prefix="nm_a")
    bob = register_user(client=ws_client, prefix="nm_b")
    charlie = register_user(client=ws_client, prefix="nm_c")

    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=3,
    ))

    tkt_charlie = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {charlie['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_charlie}") as ws_charlie:
        ws_charlie.receive_json()

        # Charlie (non-member) attempts to mark Alice & Bob's conversation as read
        ws_charlie.send_json({
            "type": "chat.read",
            "id": "nm_read_req",
            "payload": {
                "conversation_id": str(conv_id),
                "sequence": 2,
            },
        })
        err = ws_charlie.receive_json()
        assert err["type"] == "error"
        assert err["payload"]["code"] == RealtimeErrorCode.RESOURCE_NOT_FOUND.value
        assert err["payload"]["details"]["error_subcode"] == "CONVERSATION_NOT_FOUND"


def test_future_sequence_rejection(ws_client: TestClient):
    alice = register_user(ws_client, "fut_a")
    bob = register_user(ws_client, "fut_b")
    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=3,
    ))

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws:
        ws.receive_json()

        # Alice sends sequence 999 when max is 3
        ws.send_json({
            "type": "chat.read",
            "id": "fut_req",
            "payload": {
                "conversation_id": str(conv_id),
                "sequence": 999,
            },
        })
        err = ws.receive_json()
        assert err["type"] == "error"
        assert err["payload"]["code"] == RealtimeErrorCode.VALIDATION_ERROR.value
        assert err["payload"]["details"]["error_subcode"] == "FUTURE_SEQUENCE"


@pytest.mark.asyncio
async def test_monotonic_cursor_under_repeated_and_concurrent_updates():
    """
    Verifies that concurrent and out-of-order read updates monotonically advance the cursor
    and never allow regressions.
    """
    session_factory = get_test_session_factory()
    u1_id = uuid.uuid4()
    u2_id = uuid.uuid4()

    async with session_factory() as session:
        from app.models.user import User, Profile
        session.add_all([
            User(id=u1_id, username=f"mono_u1_{uuid.uuid4().hex[:6]}", is_active=True),
            User(id=u2_id, username=f"mono_u2_{uuid.uuid4().hex[:6]}", is_active=True),
        ])
        await session.flush()
        session.add_all([
            Profile(id=uuid.uuid4(), user_id=u1_id, display_name="Mono U1"),
            Profile(id=uuid.uuid4(), user_id=u2_id, display_name="Mono U2"),
        ])
        await session.commit()

    conv_id = await seed_conversation_with_messages(u1_id, u2_id, message_count=10)

    # Concurrently send sequences [2, 7, 4, 9, 3] from u1
    async def send_read(seq: int):
        async with session_factory() as session:
            payload = ChatReadInboundPayload(conversation_id=conv_id, sequence=seq)
            return await message_service.mark_conversation_read(session, u1_id, payload)

    results = await asyncio.gather(
        send_read(2),
        send_read(7),
        send_read(4),
        send_read(9),
        send_read(3),
    )

    # Verify that cursor in PostgreSQL is strictly the maximum (9)
    async with session_factory() as session:
        stmt = select(ConversationMember.last_read_seq).where(
            ConversationMember.conversation_id == conv_id,
            ConversationMember.user_id == u1_id,
        )
        res = await session.execute(stmt)
        final_seq = res.scalar_one()
        assert final_seq == 9

    # Now attempt a backward sequence (e.g. 5 when cursor is 9) -> returns None broadcast
    async with session_factory() as session:
        stale_payload = ChatReadInboundPayload(conversation_id=conv_id, sequence=5)
        stale_bcast, _ = await message_service.mark_conversation_read(session, u1_id, stale_payload)
        assert stale_bcast is None, "Stale sequence must not produce a broadcast"


@pytest.mark.asyncio
async def test_sequence_gaps_and_soft_deleted_messages_read():
    """Verifies that soft-deleted messages with sequence gaps do not obstruct monotonic read progression."""
    session_factory = get_test_session_factory()
    u1_id = uuid.uuid4()
    u2_id = uuid.uuid4()

    async with session_factory() as session:
        from app.models.user import User, Profile
        session.add_all([
            User(id=u1_id, username=f"gap_u1_{uuid.uuid4().hex[:6]}", is_active=True),
            User(id=u2_id, username=f"gap_u2_{uuid.uuid4().hex[:6]}", is_active=True),
        ])
        await session.flush()
        session.add_all([
            Profile(id=uuid.uuid4(), user_id=u1_id, display_name="Gap U1"),
            Profile(id=uuid.uuid4(), user_id=u2_id, display_name="Gap U2"),
        ])
        await session.commit()

    conv_id = await seed_conversation_with_messages(u1_id, u2_id, message_count=6)

    # Soft delete message with sequence 3 and 4
    async with session_factory() as session:
        await session.execute(
            update(Message)
            .where(Message.conversation_id == conv_id, Message.sequence.in_([3, 4]))
            .values(is_deleted=True, deleted_at=datetime.now(timezone.utc))
        )
        await session.commit()

    # User reads sequence 5 (bridging the gap)
    async with session_factory() as session:
        payload = ChatReadInboundPayload(conversation_id=conv_id, sequence=5)
        broadcast, _ = await message_service.mark_conversation_read(session, u1_id, payload)
        assert broadcast is not None
        assert broadcast.last_read_seq == 5


# ---------------------------------------------------------------------------
# 2. Typing Indicator Tests
# ---------------------------------------------------------------------------

def test_valid_typing_start_and_stop(ws_client: TestClient):
    alice = register_user(ws_client, "typ_a")
    bob = register_user(ws_client, "typ_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=2))

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]
    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
            ws_bob.receive_json()

            # 1. Alice sends typing start
            ws_alice.send_json({
                "type": "chat.typing",
                "id": "typ_start",
                "payload": {
                    "conversation_id": str(conv_id),
                    "is_typing": True,
                },
            })

            # Bob receives typing indicator
            bob_typ = ws_bob.receive_json()
            assert bob_typ["type"] == "chat.typing"
            assert bob_typ["payload"]["conversation_id"] == str(conv_id)
            assert bob_typ["payload"]["user_id"] == str(alice_id)
            assert bob_typ["payload"]["is_typing"] is True
            assert bob_typ["payload"]["expires_at"] is not None

            # Alice must NOT receive her own typing indicator
            # Verify Alice's queue is empty via ping
            ping_id = str(uuid.uuid4())
            ws_alice.send_json({"type": "client.ping", "id": ping_id, "payload": {}})
            alice_resp = ws_alice.receive_json()
            assert alice_resp["type"] == "server.pong"

            # 2. Alice sends typing stop
            ws_alice.send_json({
                "type": "chat.typing",
                "id": "typ_stop",
                "payload": {
                    "conversation_id": str(conv_id),
                    "is_typing": False,
                },
            })

            bob_stop = ws_bob.receive_json()
            assert bob_stop["type"] == "chat.typing"
            assert bob_stop["payload"]["is_typing"] is False
            assert bob_stop["payload"]["expires_at"] is None


def test_typing_disconnect_cleanup(ws_client: TestClient):
    alice = register_user(ws_client, "clean_a")
    bob = register_user(ws_client, "clean_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=2))

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]
    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
        ws_bob.receive_json()  # connection.ready

        # Alice connects, starts typing, and disconnects abruptly
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
            ws_alice.receive_json()
            ws_alice.send_json({
                "type": "chat.typing",
                "id": "alice_typ_start",
                "payload": {
                    "conversation_id": str(conv_id),
                    "is_typing": True,
                },
            })
            typ_frame = ws_bob.receive_json()
            assert typ_frame["type"] == "chat.typing"
            assert typ_frame["payload"]["is_typing"] is True

        # Alice disconnected -> Bob automatically receives stop typing cleanup
        stop_frame = ws_bob.receive_json()
        assert stop_frame["type"] == "chat.typing"
        assert stop_frame["payload"]["conversation_id"] == str(conv_id)
        assert stop_frame["payload"]["user_id"] == str(alice_id)
        assert stop_frame["payload"]["is_typing"] is False


def test_cross_conversation_broadcast_isolation(ws_client: TestClient):
    alice = register_user(ws_client, "iso_a")
    bob = register_user(ws_client, "iso_b")
    charlie = register_user(ws_client, "iso_c")
    dave = register_user(ws_client, "iso_d")

    # Conv 1: Alice & Bob
    conv1 = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]), uuid.UUID(bob["user_id"]), message_count=2
    ))
    # Conv 2: Charlie & Dave
    conv2 = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(charlie["user_id"]), uuid.UUID(dave["user_id"]), message_count=2
    ))

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]
    tkt_charlie = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {charlie['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_charlie}") as ws_charlie:
            ws_charlie.receive_json()

            # Alice types in Conv 1
            ws_alice.send_json({
                "type": "chat.typing",
                "id": "iso_typ",
                "payload": {"conversation_id": str(conv1), "is_typing": True},
            })

            # Charlie is in Conv 2; must NOT receive Conv 1's typing event
            ping_id = str(uuid.uuid4())
            ws_charlie.send_json({"type": "client.ping", "id": ping_id, "payload": {}})
            resp = ws_charlie.receive_json()
            assert resp["type"] == "server.pong"
            assert resp["payload"]["echo_id"] == ping_id


def test_block_and_membership_typing_enforcement(ws_client: TestClient):
    alice = register_user(ws_client, "blk_a")
    bob = register_user(ws_client, "blk_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=2))

    # Alice blocks Bob
    session_factory = get_test_session_factory()

    async def create_block():
        async with session_factory() as session:
            session.add(Block(id=uuid.uuid4(), blocker_id=alice_id, blocked_id=bob_id))
            await session.commit()

    asyncio.run(create_block())

    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
        ws_bob.receive_json()

        # Bob attempts to send typing indicator to Alice
        ws_bob.send_json({
            "type": "chat.typing",
            "id": "blk_typ",
            "payload": {"conversation_id": str(conv_id), "is_typing": True},
        })
        err = ws_bob.receive_json()
        assert err["type"] == "error"
        assert err["payload"]["code"] == RealtimeErrorCode.FORBIDDEN.value
        assert err["payload"]["details"]["error_subcode"] == "USER_BLOCKED"


def test_recipient_delivery_acknowledgement(ws_client: TestClient):
    alice = register_user(ws_client, "deliv_a")
    bob = register_user(ws_client, "deliv_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=3))

    session_factory = get_test_session_factory()

    # Find message sent by Alice (sequence 1)
    async def get_msg():
        async with session_factory() as session:
            res = await session.execute(
                select(Message).where(Message.conversation_id == conv_id, Message.sequence == 1)
            )
            return res.scalars().first()

    msg1 = asyncio.run(get_msg())
    assert msg1.sender_id == alice_id

    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]
    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
            ws_bob.receive_json()

            # 1. Bob (recipient) acknowledges device delivery of Alice's message
            ws_bob.send_json({
                "type": "chat.delivered",
                "id": "deliv_req_1",
                "payload": {
                    "conversation_id": str(conv_id),
                    "message_id": str(msg1.id),
                    "sequence": 1,
                },
            })

            # Alice receives delivered broadcast
            deliv_frame = ws_alice.receive_json()
            assert deliv_frame["type"] == "chat.delivered"
            assert deliv_frame["payload"]["conversation_id"] == str(conv_id)
            assert deliv_frame["payload"]["message_id"] == str(msg1.id)
            assert deliv_frame["payload"]["user_id"] == str(bob_id)
            assert deliv_frame["payload"]["sequence"] == 1

            # 2. Alice attempts to acknowledge delivery of her OWN message -> rejected
            ws_alice.send_json({
                "type": "chat.delivered",
                "id": "deliv_own_req",
                "payload": {
                    "conversation_id": str(conv_id),
                    "message_id": str(msg1.id),
                    "sequence": 1,
                },
            })
            err = ws_alice.receive_json()
            assert err["type"] == "error"
            assert err["payload"]["code"] == RealtimeErrorCode.VALIDATION_ERROR.value
            assert err["payload"]["details"]["error_subcode"] == "CANNOT_DELIVER_OWN_MESSAGE"
