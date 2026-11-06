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


def test_list_conversations_unauthenticated(client: TestClient):
    res = client.get("/api/v1/conversations")
    assert res.status_code == 401


def test_list_conversations_empty(client: TestClient):
    u1 = register_user(client, "alice")
    res = client.get(
        "/api/v1/conversations",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res.status_code == 200
    assert res.json() == []


def test_create_and_list_direct_conversation(client: TestClient):
    u1 = register_user(client, "bart")
    u2 = register_user(client, "lisa")

    # Create direct conversation
    res = client.post(
        "/api/v1/conversations",
        json={"targetUserId": u2["user_id"]},
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "direct"
    assert data["name"] == u2["payload"]["displayName"]
    assert len(data["participants"]) == 2

    conv_id = data["id"]

    # Verify u1 sees conversation in GET /api/v1/conversations
    res_list1 = client.get(
        "/api/v1/conversations",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res_list1.status_code == 200
    chats1 = res_list1.json()
    assert len(chats1) == 1
    assert chats1[0]["id"] == conv_id
    assert chats1[0]["name"] == u2["payload"]["displayName"]

    # Verify u2 sees conversation with u1's display name
    res_list2 = client.get(
        "/api/v1/conversations",
        headers={"Authorization": f"Bearer {u2['token']}"},
    )
    assert res_list2.status_code == 200
    chats2 = res_list2.json()
    assert len(chats2) == 1
    assert chats2[0]["id"] == conv_id
    assert chats2[0]["name"] == u1["payload"]["displayName"]

    # Idempotent POST /api/v1/conversations returns the existing conversation
    res_idempotent = client.post(
        "/api/v1/conversations",
        json={"targetUserId": u1["user_id"]},
        headers={"Authorization": f"Bearer {u2['token']}"},
    )
    assert res_idempotent.status_code == 201
    assert res_idempotent.json()["id"] == conv_id


def test_create_conversation_rejects_self(client: TestClient):
    u1 = register_user(client, "homer")
    res = client.post(
        "/api/v1/conversations",
        json={"targetUserId": u1["user_id"]},
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res.status_code == 400


def test_create_conversation_nonexistent_user(client: TestClient):
    u1 = register_user(client, "marge")
    res = client.post(
        "/api/v1/conversations",
        json={"targetUserId": str(uuid.uuid4())},
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res.status_code == 404


def test_list_and_search_users(client: TestClient):
    u1 = register_user(client, "ned")
    u2 = register_user(client, "maude")

    # u1 searches users without query
    res = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    # u1 should not be in the list
    assert all(u["id"] != u1["user_id"] for u in users)
    # u2 should be in the list
    assert any(u["id"] == u2["user_id"] for u in users)

    # Search with specific query
    res_query = client.get(
        f"/api/v1/users?q={u2['payload']['username']}",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res_query.status_code == 200
    matched = res_query.json()
    assert len(matched) == 1
    assert matched[0]["id"] == u2["user_id"]
    assert matched[0]["displayName"] == u2["payload"]["displayName"]


def test_search_users_case_insensitive_matching(client: TestClient):
    u1 = register_user(client, "rod")
    u2 = register_user(client, "todd")

    # Search with UPPERCASE query for username
    query_upper = u2["payload"]["username"].upper()
    res_upper = client.get(
        f"/api/v1/users?q={query_upper}",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res_upper.status_code == 200
    matched_upper = res_upper.json()
    assert any(u["id"] == u2["user_id"] for u in matched_upper)

    # Search with partial LOWERCASE query for displayName
    query_name = u2["payload"]["displayName"].lower()[:5]
    res_name = client.get(
        f"/api/v1/users?q={query_name}",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res_name.status_code == 200
    matched_name = res_name.json()
    assert any(u["id"] == u2["user_id"] for u in matched_name)


def test_registered_user_persisted_and_visible_to_new_session(client: TestClient):
    # Simulates registration in Tab 1
    new_user = register_user(client, "milhouse")

    # Simulates Incognito Tab / separate session querying /users
    observer = register_user(client, "nelson")
    res = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {observer['token']}"},
    )
    assert res.status_code == 200
    users = res.json()
    found = [u for u in users if u["id"] == new_user["user_id"]]
    assert len(found) == 1
    assert found[0]["username"] == new_user["payload"]["username"]
    assert found[0]["displayName"] == new_user["payload"]["displayName"]


def test_users_search_database_error_returns_500(client: TestClient, monkeypatch):
    u1 = register_user(client, "ralph")

    from app.api.v1.routers import users as users_module

    async def mock_execute_raise(*args, **kwargs):
        raise RuntimeError("Simulated PostgreSQL connection failure: connection refused")

    monkeypatch.setattr(AsyncSession, "execute", mock_execute_raise)

    res = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {u1['token']}"},
    )
    assert res.status_code == 500
    body = res.json()
    assert "Simulated PostgreSQL connection failure" in (body.get("detail") or body.get("message") or "")


