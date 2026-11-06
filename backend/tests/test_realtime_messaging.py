import asyncio
from datetime import datetime, timezone
from typing import Generator
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from starlette.testclient import TestClient

from app.core.config import settings
from app.deps import get_db
from app.main import app
from app.models.chat import Conversation, ConversationMember, Message
from app.models.social import Block
from app.realtime.connection_manager import connection_manager
from app.schemas.realtime import ChatSendPayload, RealtimeErrorCode
from app.services.message_service import message_service, MessageServiceError
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
    """Provides a TestClient with isolated NullPool database sessions for WebSocket lifecycle testing."""
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


def sync_register_user(client: TestClient, prefix: str = "rt_msg") -> dict:
    """Helper to provision a user via TestClient synchronously."""
    uid = str(uuid.uuid4())
    unique_email = f"{prefix}_{uuid.uuid4().hex[:6]}@toonchat.dev"
    token = create_mock_supabase_token(uid, unique_email)
    payload = {
        "username": f"{prefix}_{uuid.uuid4().hex[:6]}",
        "displayName": f"User {prefix}",
        "email": unique_email,
        "characterBase": 1,
    }
    response = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201, f"Register failed: {response.status_code} - {response.text}"
    return {"user_id": uid, "token": token, "payload": payload}


async def async_create_direct_conversation(
    user1_id: uuid.UUID,
    user2_id: uuid.UUID,
) -> uuid.UUID:
    """Creates a direct conversation between two users in the database."""
    session_factory = get_test_session_factory()
    async with session_factory() as session:
        conv_id = uuid.uuid4()
        min_u = min(user1_id, user2_id)
        max_u = max(user1_id, user2_id)
        conv = Conversation(
            id=conv_id,
            type="direct",
            direct_user1_id=min_u,
            direct_user2_id=max_u,
            message_seq_counter=0,
        )
        session.add(conv)
        await session.flush()

        m1 = ConversationMember(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            user_id=user1_id,
            role="member",
            last_read_seq=0,
        )
        m2 = ConversationMember(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            user_id=user2_id,
            role="member",
            last_read_seq=0,
        )
        session.add_all([m1, m2])
        await session.commit()
        return conv_id


async def async_create_block(blocker_id: uuid.UUID, blocked_id: uuid.UUID) -> None:
    session_factory = get_test_session_factory()
    async with session_factory() as session:
        block = Block(
            id=uuid.uuid4(),
            blocker_id=blocker_id,
            blocked_id=blocked_id,
        )
        session.add(block)
        await session.commit()


# ---------------------------------------------------------------------------
# Concurrency & Transactional Sequence Tests (Service Layer)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_sends_and_sequence_ordering():
    """
    Verifies that concurrent message sends within the same conversation allocate
    strictly unique, sequential monotonic sequence numbers without duplicates.
    """
    session_factory = get_test_session_factory()
    u1_id = uuid.uuid4()
    u2_id = uuid.uuid4()

    # Create dummy users and conversation
    async with session_factory() as session:
        from app.models.user import User, Profile
        u1 = User(id=u1_id, username=f"u1_{uuid.uuid4().hex[:6]}", is_active=True)
        u2 = User(id=u2_id, username=f"u2_{uuid.uuid4().hex[:6]}", is_active=True)
        session.add_all([u1, u2])
        await session.flush()
        session.add_all([
            Profile(id=uuid.uuid4(), user_id=u1_id, display_name="User 1"),
            Profile(id=uuid.uuid4(), user_id=u2_id, display_name="User 2"),
        ])
        await session.commit()

    conv_id = await async_create_direct_conversation(u1_id, u2_id)

    # Concurrently send 10 messages (5 from u1, 5 from u2)
    async def send_msg(sender: uuid.UUID, idx: int):
        async with session_factory() as session:
            payload = ChatSendPayload(
                conversation_id=conv_id,
                client_message_id=f"cmsg_concurrent_{sender}_{idx}",
                type="text",
                body=f"Message {idx} from {sender}",
            )
            return await message_service.allocate_and_insert_message(
                session, sender, payload
            )

    tasks = []
    for i in range(5):
        tasks.append(send_msg(u1_id, i))
        tasks.append(send_msg(u2_id, i))

    results = await asyncio.gather(*tasks)

    # Check sequences
    sequences = [r.message.sequence for r in results]
    assert len(sequences) == 10
    # Strict monotonicity: sequences must be exactly 1 to 10
    assert sorted(sequences) == list(range(1, 11))
    assert len(set(sequences)) == 10, "Duplicate sequence numbers detected!"

    # Verify conversation counter in database
    async with session_factory() as session:
        conv_res = await session.execute(
            select(Conversation).where(Conversation.id == conv_id)
        )
        conv = conv_res.scalars().first()
        assert conv.message_seq_counter == 10


@pytest.mark.asyncio
async def test_database_uniqueness_conflict_concurrent_race():
    """
    Verifies that when two concurrent tasks race with the exact same (sender_id, client_message_id),
    one commits as the race winner, and the second catches the uniqueness conflict, rolls back,
    and returns the winner's message as an idempotent retry.
    """
    session_factory = get_test_session_factory()
    u1_id = uuid.uuid4()
    u2_id = uuid.uuid4()

    async with session_factory() as session:
        from app.models.user import User, Profile
        u1 = User(id=u1_id, username=f"race_u1_{uuid.uuid4().hex[:6]}", is_active=True)
        u2 = User(id=u2_id, username=f"race_u2_{uuid.uuid4().hex[:6]}", is_active=True)
        session.add_all([u1, u2])
        await session.flush()
        session.add_all([
            Profile(id=uuid.uuid4(), user_id=u1_id, display_name="Race User 1"),
            Profile(id=uuid.uuid4(), user_id=u2_id, display_name="Race User 2"),
        ])
        await session.commit()

    conv_id = await async_create_direct_conversation(u1_id, u2_id)
    same_client_id = f"race_cmsg_{uuid.uuid4().hex}"

    async def race_send():
        async with session_factory() as session:
            payload = ChatSendPayload(
                conversation_id=conv_id,
                client_message_id=same_client_id,
                type="text",
                body="Racer payload",
            )
            return await message_service.allocate_and_insert_message(
                session, u1_id, payload
            )

    res1, res2 = await asyncio.gather(race_send(), race_send())

    # Both must return the exact same message ID and sequence
    assert res1.message.id == res2.message.id
    assert res1.message.sequence == res2.message.sequence
    assert res1.message.sequence == 1

    # Exactly one was initial insert (is_retry=False) and the other was retry (is_retry=True)
    retry_statuses = [res1.is_retry, res2.is_retry]
    assert True in retry_statuses
    assert False in retry_statuses

    # Only 1 row in DB
    async with session_factory() as session:
        msg_res = await session.execute(
            select(Message).where(Message.conversation_id == conv_id)
        )
        messages = msg_res.scalars().all()
        assert len(messages) == 1


@pytest.mark.asyncio
async def test_transaction_rollback_preserves_sequence_continuity():
    """
    Verifies that if a message insert fails or is rolled back, the sequence counter
    increment rolls back with the transaction, preventing sequence leakage.
    """
    session_factory = get_test_session_factory()
    u1_id = uuid.uuid4()
    u2_id = uuid.uuid4()

    async with session_factory() as session:
        from app.models.user import User, Profile
        u1 = User(id=u1_id, username=f"rb_u1_{uuid.uuid4().hex[:6]}", is_active=True)
        u2 = User(id=u2_id, username=f"rb_u2_{uuid.uuid4().hex[:6]}", is_active=True)
        session.add_all([u1, u2])
        await session.flush()
        session.add_all([
            Profile(id=uuid.uuid4(), user_id=u1_id, display_name="Rollback User 1"),
            Profile(id=uuid.uuid4(), user_id=u2_id, display_name="Rollback User 2"),
        ])
        await session.commit()

    conv_id = await async_create_direct_conversation(u1_id, u2_id)

    # 1. Successful message -> sequence 1
    async with session_factory() as session:
        p1 = ChatSendPayload(
            conversation_id=conv_id,
            client_message_id="cmsg_1",
            type="text",
            body="Hello 1",
        )
        res1 = await message_service.allocate_and_insert_message(session, u1_id, p1)
        assert res1.message.sequence == 1

    # 2. Failed message with non-existent reply_to_id -> rolls back
    fake_reply_id = uuid.uuid4()
    async with session_factory() as session:
        p2 = ChatSendPayload(
            conversation_id=conv_id,
            client_message_id="cmsg_fail",
            type="text",
            body="Hello fail",
            reply_to_id=fake_reply_id,
        )
        with pytest.raises(MessageServiceError) as exc_info:
            await message_service.allocate_and_insert_message(session, u1_id, p2)
        assert exc_info.value.code == RealtimeErrorCode.VALIDATION_ERROR

    # 3. Next message must receive sequence 2 (no gap from 1 to 3)
    async with session_factory() as session:
        p3 = ChatSendPayload(
            conversation_id=conv_id,
            client_message_id="cmsg_2",
            type="text",
            body="Hello 2",
        )
        res3 = await message_service.allocate_and_insert_message(session, u1_id, p3)
        assert res3.message.sequence == 2


# ---------------------------------------------------------------------------
# End-to-End WebSocket Lifecycle, Idempotency & Fan-Out Tests
# ---------------------------------------------------------------------------

def test_successful_persistent_send(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="alice")
    bob = sync_register_user(ws_client, prefix="bob")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

    # Obtain tickets
    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]
    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ready_alice = ws_alice.receive_json()
        assert ready_alice["type"] == "connection.ready"

        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
            ready_bob = ws_bob.receive_json()
            assert ready_bob["type"] == "connection.ready"

            # Alice sends message
            cmsg_id = f"cmsg_{uuid.uuid4().hex[:8]}"
            send_frame = {
                "type": "chat.send",
                "id": str(uuid.uuid4()),
                "ts": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "conversation_id": str(conv_id),
                    "client_message_id": cmsg_id,
                    "type": "text",
                    "body": "Hey Bob! Ready for skate park? 🛹✨",
                },
            }
            ws_alice.send_json(send_frame)

            # 1. Alice receives chat.ack
            ack_frame = ws_alice.receive_json()
            assert ack_frame["type"] == "chat.ack"
            assert ack_frame["payload"]["client_message_id"] == cmsg_id
            assert ack_frame["payload"]["sequence"] == 1
            assert ack_frame["payload"]["status"] == "sent"

            # 2. Bob receives chat.message fan-out
            bob_msg_frame = ws_bob.receive_json()
            assert bob_msg_frame["type"] == "chat.message"
            assert bob_msg_frame["payload"]["sequence"] == 1
            assert bob_msg_frame["payload"]["body"] == "Hey Bob! Ready for skate park? 🛹✨"
            assert bob_msg_frame["payload"]["sender_id"] == str(alice_id)
            assert bob_msg_frame["payload"]["sender"]["username"] == alice["payload"]["username"]

            # 3. Alice also receives multi-tab chat.message
            alice_msg_frame = ws_alice.receive_json()
            assert alice_msg_frame["type"] == "chat.message"
            assert alice_msg_frame["payload"]["client_message_id"] == cmsg_id


def test_idempotent_retry_and_no_duplicate_fanout(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="retry_a")
    bob = sync_register_user(ws_client, prefix="retry_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

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

            cmsg_id = "cmsg_idempotent_test_1"
            send_frame = {
                "type": "chat.send",
                "id": str(uuid.uuid4()),
                "payload": {
                    "conversation_id": str(conv_id),
                    "client_message_id": cmsg_id,
                    "type": "text",
                    "body": "First send attempt",
                },
            }

            # 1. First send
            ws_alice.send_json(send_frame)
            ack1 = ws_alice.receive_json()
            assert ack1["type"] == "chat.ack"
            assert ack1["payload"]["sequence"] == 1
            original_msg_id = ack1["payload"]["message_id"]

            bob_frame1 = ws_bob.receive_json()
            assert bob_frame1["type"] == "chat.message"
            ws_alice.receive_json()  # Alice's fanout

            # 2. Second send with EXACT SAME client_message_id (idempotent retry)
            ws_alice.send_json(send_frame)
            ack2 = ws_alice.receive_json()
            assert ack2["type"] == "chat.ack"
            # Must return the exact original message ID and sequence
            assert ack2["payload"]["message_id"] == original_msg_id
            assert ack2["payload"]["sequence"] == 1

            # 3. Bob MUST NOT receive a second broadcast on retry!
            # We verify Bob's queue is empty by sending a ping from Bob and ensuring pong is next
            ping_id = str(uuid.uuid4())
            ws_bob.send_json({"type": "client.ping", "id": ping_id, "payload": {}})
            bob_resp = ws_bob.receive_json()
            # If a duplicate chat.message was broadcast, it would arrive before server.pong
            assert bob_resp["type"] == "server.pong"
            assert bob_resp["payload"]["echo_id"] == ping_id


def test_different_senders_independent_client_ids(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="diff_a")
    bob = sync_register_user(ws_client, prefix="diff_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

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

            # Both Alice and Bob use the EXACT SAME client_message_id string
            common_client_id = "client_msg_default_123"

            # Alice sends
            ws_alice.send_json({
                "type": "chat.send",
                "id": str(uuid.uuid4()),
                "payload": {
                    "conversation_id": str(conv_id),
                    "client_message_id": common_client_id,
                    "type": "text",
                    "body": "Alice's message",
                },
            })
            ack_alice = ws_alice.receive_json()
            assert ack_alice["type"] == "chat.ack"
            assert ack_alice["payload"]["sequence"] == 1

            # Bob sends with same client_message_id -> MUST SUCCEED (scoped to sender_id)
            ws_bob.send_json({
                "type": "chat.send",
                "id": str(uuid.uuid4()),
                "payload": {
                    "conversation_id": str(conv_id),
                    "client_message_id": common_client_id,
                    "type": "text",
                    "body": "Bob's message",
                },
            })
            # Drain Alice's incoming message broadcast from Bob's queue first
            _alice_msg_on_bob = ws_bob.receive_json()
            ack_bob = ws_bob.receive_json()
            assert ack_bob["type"] == "chat.ack"
            assert ack_bob["payload"]["sequence"] == 2


def test_non_member_send_rejection(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="mem_a")
    bob = sync_register_user(ws_client, prefix="mem_b")
    charlie = sync_register_user(ws_client, prefix="intruder")

    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    # Conversation only between Alice and Bob
    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

    tkt_charlie = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {charlie['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_charlie}") as ws_charlie:
        ws_charlie.receive_json()

        req_id = str(uuid.uuid4())
        ws_charlie.send_json({
            "type": "chat.send",
            "id": req_id,
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": "intruder_msg_1",
                "type": "text",
                "body": "I am not supposed to be here!",
            },
        })

        err = ws_charlie.receive_json()
        assert err["type"] == "error"
        # DEFECT C Privacy policy: Non-members receive indistinguishable RESOURCE_NOT_FOUND
        assert err["payload"]["code"] == RealtimeErrorCode.RESOURCE_NOT_FOUND.value
        assert err["payload"]["details"]["error_subcode"] == "CONVERSATION_NOT_FOUND"
        assert err["payload"]["echo_id"] == req_id


def test_invalid_foreign_conversation_rejection(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="nonconv")
    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()

        random_conv_id = str(uuid.uuid4())
        ws_alice.send_json({
            "type": "chat.send",
            "id": "test_missing_conv",
            "payload": {
                "conversation_id": random_conv_id,
                "client_message_id": "cmsg_missing",
                "type": "text",
                "body": "Message to nowhere",
            },
        })

        err = ws_alice.receive_json()
        assert err["type"] == "error"
        assert err["payload"]["code"] == RealtimeErrorCode.RESOURCE_NOT_FOUND.value
        assert err["payload"]["details"]["error_subcode"] == "CONVERSATION_NOT_FOUND"


def test_block_enforcement_direct_chat(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="block_a")
    bob = sync_register_user(ws_client, prefix="block_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))
    # Alice blocks Bob
    asyncio.run(async_create_block(alice_id, bob_id))

    tkt_bob = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {bob['token']}"},
    ).json()["ticket"]
    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    # Bob attempts to send to Alice
    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_bob}") as ws_bob:
        ws_bob.receive_json()

        ws_bob.send_json({
            "type": "chat.send",
            "id": "block_test_bob",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": "cmsg_blocked_bob",
                "type": "text",
                "body": "Can you hear me?",
            },
        })
        err_bob = ws_bob.receive_json()
        assert err_bob["type"] == "error"
        assert err_bob["payload"]["code"] == RealtimeErrorCode.FORBIDDEN.value
        assert err_bob["payload"]["details"]["error_subcode"] == "USER_BLOCKED"

    # Alice also cannot send to Bob while block is active
    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()

        ws_alice.send_json({
            "type": "chat.send",
            "id": "block_test_alice",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": "cmsg_blocked_alice",
                "type": "text",
                "body": "Should fail too",
            },
        })
        err_alice = ws_alice.receive_json()
        assert err_alice["type"] == "error"
        assert err_alice["payload"]["code"] == RealtimeErrorCode.FORBIDDEN.value
        assert err_alice["payload"]["details"]["error_subcode"] == "USER_BLOCKED"


def test_retry_after_uncertain_acknowledgment(ws_client: TestClient):
    alice = sync_register_user(ws_client, prefix="unc_a")
    bob = sync_register_user(ws_client, prefix="unc_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

    cmsg_id = "cmsg_uncertain_drop_1"
    tkt1 = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    # Connect, send message, and immediately close connection before processing ack
    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt1}") as ws:
        ws.receive_json()
        ws.send_json({
            "type": "chat.send",
            "id": "uncertain_send",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": cmsg_id,
                "type": "text",
                "body": "Did this go through?",
            },
        })
        ack1 = ws.receive_json()
        first_seq = ack1["payload"]["sequence"]
        first_msg_id = ack1["payload"]["message_id"]

    # Reconnect with fresh ticket and resend with same client_message_id
    tkt2 = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt2}") as ws2:
        ws2.receive_json()
        ws2.send_json({
            "type": "chat.send",
            "id": "uncertain_resend",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": cmsg_id,
                "type": "text",
                "body": "Did this go through?",
            },
        })
        ack2 = ws2.receive_json()
        assert ack2["type"] == "chat.ack"
        assert ack2["payload"]["message_id"] == first_msg_id
        assert ack2["payload"]["sequence"] == first_seq


def test_commit_followed_by_publication_failure(ws_client: TestClient, monkeypatch):
    """
    Verifies that if realtime publication/broadcast fails (e.g. transport error during fanout),
    the message remains committed in PostgreSQL with its allocated sequence, and the sender's
    direct acknowledgment is preserved.
    """
    alice = sync_register_user(ws_client, prefix="pubfail_a")
    bob = sync_register_user(ws_client, prefix="pubfail_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

    original_broadcast = connection_manager.broadcast_to_user

    async def failing_broadcast(target_user_id: uuid.UUID, envelope):
        if target_user_id == bob_id:
            raise RuntimeError("Simulated broker/socket failure during member fanout!")
        return await original_broadcast(target_user_id, envelope)

    monkeypatch.setattr(connection_manager, "broadcast_to_user", failing_broadcast)

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()

        cmsg_id = "cmsg_pub_fail_1"
        ws_alice.send_json({
            "type": "chat.send",
            "id": "pub_fail_send",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": cmsg_id,
                "type": "text",
                "body": "Committed despite publication failure",
            },
        })

        # Sender STILL receives chat.ack because DB commit was successful
        ack = ws_alice.receive_json()
        assert ack["type"] == "chat.ack"
        assert ack["payload"]["client_message_id"] == cmsg_id
        assert ack["payload"]["sequence"] == 1
        committed_msg_id = uuid.UUID(ack["payload"]["message_id"])

    # Verify message is permanently in PostgreSQL
    session_factory = get_test_session_factory()

    async def verify_db():
        async with session_factory() as session:
            msg = await session.get(Message, committed_msg_id)
            assert msg is not None
            assert msg.sequence == 1
            assert msg.body == "Committed despite publication failure"

    asyncio.run(verify_db())


def test_idempotent_retry_changed_payload_conflict(ws_client: TestClient):
    """
    Verifies that when a client reuses client_message_id within the same conversation
    but modifies the canonical payload (e.g. body changed), the server rejects it
    with a sanitized CONFLICT error instead of silently returning the old message.
    """
    alice = sync_register_user(ws_client, prefix="pay_a")
    bob = sync_register_user(ws_client, prefix="pay_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(async_create_direct_conversation(alice_id, bob_id))

    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws_alice:
        ws_alice.receive_json()  # connection.ready

        cmsg_id = "cmsg_payload_conflict_1"

        # 1. First send
        ws_alice.send_json({
            "type": "chat.send",
            "id": "send_original",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": cmsg_id,
                "type": "text",
                "body": "Original payload content",
            },
        })
        ack = ws_alice.receive_json()
        assert ack["type"] == "chat.ack"
        assert ack["payload"]["client_message_id"] == cmsg_id
        # Drain Alice's incoming multi-tab broadcast from send 1
        msg_broadcast = ws_alice.receive_json()
        assert msg_broadcast["type"] == "chat.message"

        # 2. Second send with SAME client_message_id but CHANGED body
        ws_alice.send_json({
            "type": "chat.send",
            "id": "send_tampered",
            "payload": {
                "conversation_id": str(conv_id),
                "client_message_id": cmsg_id,
                "type": "text",
                "body": "Tampered/different payload content!",
            },
        })
        err = ws_alice.receive_json()
        assert err["type"] == "error"
        assert err["payload"]["code"] == RealtimeErrorCode.CONFLICT.value
        assert err["payload"]["details"]["error_subcode"] == "CLIENT_MESSAGE_ID_CONFLICT"
        assert err["payload"]["echo_id"] == "send_tampered"


@pytest.mark.asyncio
async def test_concurrent_same_client_id_different_conversations_race():
    """
    Verifies that when the same sender concurrently races the identical client_message_id
    across two DIFFERENT conversations, one commits as the race winner, and the second
    catches the uniqueness conflict, rolls back, and raises CONFLICT rather than
    falsely returning the winner's message from the other conversation.
    """
    session_factory = get_test_session_factory()
    u1_id = uuid.uuid4()
    u2_id = uuid.uuid4()
    u3_id = uuid.uuid4()

    async with session_factory() as session:
        from app.models.user import User, Profile
        session.add_all([
            User(id=u1_id, username=f"race_diff_u1_{uuid.uuid4().hex[:6]}", is_active=True),
            User(id=u2_id, username=f"race_diff_u2_{uuid.uuid4().hex[:6]}", is_active=True),
            User(id=u3_id, username=f"race_diff_u3_{uuid.uuid4().hex[:6]}", is_active=True),
        ])
        await session.flush()
        session.add_all([
            Profile(id=uuid.uuid4(), user_id=u1_id, display_name="Sender U1"),
            Profile(id=uuid.uuid4(), user_id=u2_id, display_name="Recipient U2"),
            Profile(id=uuid.uuid4(), user_id=u3_id, display_name="Recipient U3"),
        ])
        await session.commit()

    conv1_id = await async_create_direct_conversation(u1_id, u2_id)
    conv2_id = await async_create_direct_conversation(u1_id, u3_id)

    shared_client_id = f"cross_conv_race_{uuid.uuid4().hex}"

    async def send_to_conv(conv_id: uuid.UUID):
        async with session_factory() as session:
            payload = ChatSendPayload(
                conversation_id=conv_id,
                client_message_id=shared_client_id,
                type="text",
                body=f"Payload for conv {conv_id}",
            )
            try:
                result = await message_service.allocate_and_insert_message(
                    session, u1_id, payload
                )
                return {"status": "success", "result": result}
            except MessageServiceError as mse:
                return {"status": "error", "error": mse}

    res1, res2 = await asyncio.gather(
        send_to_conv(conv1_id),
        send_to_conv(conv2_id),
    )

    statuses = [res1["status"], res2["status"]]
    assert "success" in statuses, "At least one concurrent task must succeed"
    assert "error" in statuses, "The losing cross-conversation task must be rejected"

    # Find error response
    err_res = res1 if res1["status"] == "error" else res2
    assert err_res["error"].code == RealtimeErrorCode.CONFLICT
    assert err_res["error"].details["error_subcode"] == "CLIENT_MESSAGE_ID_CONFLICT"


def test_sanitized_error_handling_no_internals_leaked(ws_client: TestClient):
    """
    Verifies that invalid envelope, malformed JSON, and server-side errors return
    strictly sanitized error codes without leaking database internals, SQL, or tracebacks.
    """
    alice = sync_register_user(ws_client, prefix="sec_err")
    tkt_alice = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {alice['token']}"},
    ).json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={tkt_alice}") as ws:
        ws.receive_json()  # connection.ready

        # 1. Send malformed JSON text
        ws.send_text("this is not json {{{")
        err1 = ws.receive_json()
        assert err1["type"] == "error"
        assert err1["payload"]["code"] == RealtimeErrorCode.VALIDATION_ERROR.value
        assert err1["payload"]["details"] == {"error_subcode": "INVALID_JSON"}
        # Must not contain Python exception strings or tracebacks
        assert "JSONDecodeError" not in err1["payload"]["message"]
        assert "Traceback" not in str(err1)

        # 2. Send invalid envelope schema (extra disallowed property)
        ws.send_json({"type": "client.ping", "id": "123", "ts": "bad", "extra_prop": True})
        err2 = ws.receive_json()
        assert err2["type"] == "error"
        assert err2["payload"]["code"] == RealtimeErrorCode.VALIDATION_ERROR.value
        assert err2["payload"]["details"] == {"error_subcode": "INVALID_ENVELOPE"}
        assert "Traceback" not in str(err2)


