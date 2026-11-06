import asyncio
from datetime import datetime, timezone
from typing import Generator
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from starlette.testclient import TestClient

from app.core.config import settings
from app.deps import get_db
from app.main import app
from app.models.chat import Conversation, ConversationMember, Message
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
def client() -> Generator[TestClient, None, None]:
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
    with TestClient(app) as test_client:
        yield test_client
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
    message_count: int = 10,
) -> uuid.UUID:
    """Helper to populate a direct conversation with sequentially numbered messages."""
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
# REST Message History Tests
# ---------------------------------------------------------------------------

def test_authenticated_history_request_success(client: TestClient):
    alice = register_user(client, "hist_a")
    bob = register_user(client, "hist_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=5))

    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["conversation_id"] == str(conv_id)
    assert data["count"] == 5
    assert len(data["messages"]) == 5
    assert data["has_more"] is False
    assert data["oldest_seq"] == 1
    assert data["latest_seq"] == 5

    # Check safe DTO fields
    first_msg = data["messages"][0]
    assert first_msg["sequence"] == 1
    assert first_msg["body"] == "Test message body 1"
    assert first_msg["sender"]["username"] == alice["payload"]["username"]
    assert first_msg["sender"]["display_name"] == alice["payload"]["displayName"]
    assert "client_message_id" in first_msg


def test_unauthorized_request_rejected(client: TestClient):
    fake_conv = uuid.uuid4()
    # No Authorization header
    res = client.get(f"/api/v1/conversations/{fake_conv}/messages")
    assert res.status_code == 401
    assert res.json()["code"] == "UNAUTHORIZED"

    # Malformed token
    res2 = client.get(
        f"/api/v1/conversations/{fake_conv}/messages",
        headers={"Authorization": "Bearer bad.token.here"},
    )
    assert res2.status_code == 401


def test_non_member_access_returns_404_privacy(client: TestClient):
    alice = register_user(client, "priv_a")
    bob = register_user(client, "priv_b")
    charlie = register_user(client, "priv_c")

    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=3,
    ))

    # Charlie (not a member) requests Alice & Bob's conversation history
    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {charlie['token']}"},
    )
    # DEFECT C Privacy policy: Non-members receive 404 RESOURCE_NOT_FOUND (not 403)
    assert res.status_code == 404
    assert res.json()["code"] == "RESOURCE_NOT_FOUND"


def test_invalid_foreign_conversation_returns_404(client: TestClient):
    alice = register_user(client, "inv_a")
    random_conv_id = uuid.uuid4()

    res = client.get(
        f"/api/v1/conversations/{random_conv_id}/messages",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 404
    assert res.json()["code"] == "RESOURCE_NOT_FOUND"


def test_after_seq_catchup_recovery(client: TestClient):
    """Verifies that after_seq returns strictly messages with sequence > after_seq in ascending order."""
    alice = register_user(client, "catch_a")
    bob = register_user(client, "catch_b")

    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=10,
    ))

    # Client already has messages up to sequence 6; catches up on sequence > 6
    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages?after_seq=6",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["count"] == 4
    sequences = [m["sequence"] for m in data["messages"]]
    assert sequences == [7, 8, 9, 10]
    assert data["oldest_seq"] == 7
    assert data["latest_seq"] == 10
    assert data["has_more"] is False


def test_before_seq_older_history_pagination(client: TestClient):
    """Verifies that before_seq fetches older messages in stable chronological order."""
    alice = register_user(client, "pag_a")
    bob = register_user(client, "pag_b")

    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=15,
    ))

    # Client has seen messages from sequence 11 and scrolls back; limit 5 before sequence 11
    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages?before_seq=11&limit=5",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["count"] == 5
    sequences = [m["sequence"] for m in data["messages"]]
    # Must be returned in ascending order: [6, 7, 8, 9, 10]
    assert sequences == [6, 7, 8, 9, 10]
    assert data["oldest_seq"] == 6
    assert data["latest_seq"] == 10
    # There are messages 1..5 still remaining older
    assert data["has_more"] is True


def test_page_size_limits_and_validation(client: TestClient):
    alice = register_user(client, "lim_a")
    bob = register_user(client, "lim_b")

    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=10,
    ))

    # 1. Bounded limit = 3
    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages?limit=3",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 3
    assert data["has_more"] is True

    # 2. Exceed maximum limit (max is 100)
    res_exceed = client.get(
        f"/api/v1/conversations/{conv_id}/messages?limit=101",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res_exceed.status_code == 422  # Request validation error

    # 3. Invalid bounds: after_seq >= before_seq
    res_bounds = client.get(
        f"/api/v1/conversations/{conv_id}/messages?after_seq=10&before_seq=5",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res_bounds.status_code == 400
    assert res_bounds.json()["code"] == "BAD_REQUEST"


def test_deleted_messages_and_soft_deleted_conversation(client: TestClient):
    alice = register_user(client, "del_a")
    bob = register_user(client, "del_b")
    alice_id = uuid.UUID(alice["user_id"])
    bob_id = uuid.UUID(bob["user_id"])

    conv_id = asyncio.run(seed_conversation_with_messages(alice_id, bob_id, message_count=6))

    session_factory = get_test_session_factory()

    # Soft delete message with sequence 3
    async def soft_delete_msg():
        async with session_factory() as session:
            from sqlalchemy import update
            await session.execute(
                update(Message)
                .where(Message.conversation_id == conv_id, Message.sequence == 3)
                .values(is_deleted=True, deleted_at=datetime.now(timezone.utc))
            )
            await session.commit()

    asyncio.run(soft_delete_msg())

    # Fetch history; message 3 must be omitted, sequences should be [1, 2, 4, 5, 6]
    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 200
    data = res.json()
    sequences = [m["sequence"] for m in data["messages"]]
    assert 3 not in sequences
    assert sequences == [1, 2, 4, 5, 6]

    # Soft delete entire conversation
    async def soft_delete_conv():
        async with session_factory() as session:
            from sqlalchemy import update
            await session.execute(
                update(Conversation)
                .where(Conversation.id == conv_id)
                .values(deleted_at=datetime.now(timezone.utc))
            )
            await session.commit()

    asyncio.run(soft_delete_conv())

    # Fetching deleted conversation returns 404
    res_del_conv = client.get(
        f"/api/v1/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res_del_conv.status_code == 404
    assert res_del_conv.json()["code"] == "RESOURCE_NOT_FOUND"


def test_empty_conversation_returns_empty_batch(client: TestClient):
    alice = register_user(client, "emp_a")
    bob = register_user(client, "emp_b")

    conv_id = asyncio.run(seed_conversation_with_messages(
        uuid.UUID(alice["user_id"]),
        uuid.UUID(bob["user_id"]),
        message_count=0,
    ))

    res = client.get(
        f"/api/v1/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {alice['token']}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["messages"] == []
    assert data["count"] == 0
    assert data["has_more"] is False
    assert data["oldest_seq"] is None
    assert data["latest_seq"] is None


def test_phase_11_auth_regression(client: TestClient):
    """Ensures Phase 11 registration, me endpoint, and realtime ticket issuance operate flawlessly."""
    user = register_user(client, "p11_reg")

    # 1. /api/v1/me returns profile
    me_res = client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {user['token']}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["user"]["username"] == user["payload"]["username"]

    # 2. /api/v1/realtime/ticket issues ticket
    tkt_res = client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {user['token']}"},
    )
    assert tkt_res.status_code == 200
    tkt_data = tkt_res.json()
    assert tkt_data["ticket"].startswith("tkt_")
    assert tkt_data["expires_in"] == 60
