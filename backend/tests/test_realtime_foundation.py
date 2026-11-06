import asyncio
import time
import uuid
from typing import Generator
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import settings
from app.deps import get_db
from app.main import app
from app.realtime.connection_manager import connection_manager
from app.realtime.ticket_store import ticket_store
from app.schemas.realtime import RealtimeCloseCode, RealtimeErrorCode
from tests.test_auth import create_mock_supabase_token


@pytest.fixture(autouse=True)
def setup_jwt_secret(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")


@pytest.fixture
def ws_client() -> Generator[TestClient, None, None]:
    """Provides a TestClient with isolated NullPool database sessions for WebSocket lifecycle testing."""
    test_engine = create_async_engine(
        settings.effective_database_url,
        poolclass=NullPool,
    )
    test_session_factory = async_sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=AsyncSession,
    )

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


def sync_register_user(client: TestClient, prefix: str = "rt_user") -> dict:
    """Helper to provision a user via TestClient synchronously."""
    uid = str(uuid.uuid4())
    unique_email = f"{prefix}_{uuid.uuid4().hex[:6]}@toonchat.dev"
    token = create_mock_supabase_token(uid, unique_email)
    payload = {
        "username": f"{prefix}_{uuid.uuid4().hex[:6]}",
        "displayName": "Realtime Tester",
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


# ---------------------------------------------------------------------------
# Unit Tests for Ticket Store
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ticket_store_issue_and_consume():
    uid = uuid.uuid4()
    ticket = await ticket_store.issue_ticket(uid, ttl_seconds=60)
    assert ticket.startswith("tkt_")

    # First consumption succeeds
    consumed_uid = await ticket_store.consume_ticket(ticket)
    assert consumed_uid == uid

    # Second consumption of the same ticket fails (atomic single-use)
    reconsumed = await ticket_store.consume_ticket(ticket)
    assert reconsumed is None


@pytest.mark.asyncio
async def test_ticket_store_expiration():
    uid = uuid.uuid4()
    ticket = await ticket_store.issue_ticket(uid, ttl_seconds=-1)
    consumed = await ticket_store.consume_ticket(ticket)
    assert consumed is None


@pytest.mark.asyncio
async def test_ticket_store_concurrent_race_single_winner():
    uid = uuid.uuid4()
    ticket = await ticket_store.issue_ticket(uid, ttl_seconds=60)

    # 10 concurrent tasks attempt to consume the exact same ticket
    results = await asyncio.gather(
        *[ticket_store.consume_ticket(ticket) for _ in range(10)]
    )

    # Exactly one consumption must return uid; all 9 others must return None
    winners = [r for r in results if r == uid]
    losers = [r for r in results if r is None]
    assert len(winners) == 1
    assert len(losers) == 9


# ---------------------------------------------------------------------------
# Integration Tests for REST Ticket Endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ticket_issuance_unauthorized(async_client: AsyncClient):
    # Missing Authorization header
    res = await async_client.post("/api/v1/realtime/ticket")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# WebSocket Connection Lifecycle & Edge Cases (Synchronous TestClient)
# ---------------------------------------------------------------------------

def test_websocket_missing_ticket(ws_client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with ws_client.websocket_connect("/api/v1/realtime/ws"):
            pass
    assert exc_info.value.code == RealtimeCloseCode.UNAUTHORIZED_TICKET.value


def test_websocket_cswsh_unauthorized_origin_rejection(ws_client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with ws_client.websocket_connect(
            "/api/v1/realtime/ws?ticket=tkt_fake",
            headers={"Origin": "https://malicious-attacker.com"},
        ):
            pass
    assert exc_info.value.code == RealtimeCloseCode.FORBIDDEN_USER.value


def test_websocket_invalid_ticket(ws_client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with ws_client.websocket_connect("/api/v1/realtime/ws?ticket=tkt_nonexistent_fake"):
            pass
    assert exc_info.value.code == RealtimeCloseCode.UNAUTHORIZED_TICKET.value


def test_websocket_valid_connection_lifecycle(ws_client: TestClient):
    user_info = sync_register_user(ws_client, prefix="ws_user")
    token = user_info["token"]
    uid = user_info["user_id"]

    # 1. Issue ticket via REST
    ticket_res = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ticket_res.status_code == 200, f"Ticket error: {ticket_res.status_code} - {ticket_res.text}"
    ticket = ticket_res.json()["ticket"]

    # 2. Connect WebSocket
    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={ticket}") as ws:
        # Verify connection.ready frame received
        ready_frame = ws.receive_json()
        assert ready_frame["type"] == "connection.ready"
        assert ready_frame["payload"]["user_id"] == uid
        assert "session_id" in ready_frame["payload"]
        assert ready_frame["payload"]["heartbeat_interval_sec"] == 30

        # 3. Test heartbeat ping-pong
        ping_id = str(uuid.uuid4())
        ws.send_json({"type": "client.ping", "id": ping_id, "payload": {}})
        pong_frame = ws.receive_json()
        assert pong_frame["type"] == "server.pong"
        assert pong_frame["payload"]["echo_id"] == ping_id


def test_websocket_ticket_reuse_rejected(ws_client: TestClient):
    user_info = sync_register_user(ws_client, prefix="reuse_user")
    token = user_info["token"]

    # Issue single ticket
    ticket_res = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ticket_res.status_code == 200, f"Ticket error: {ticket_res.status_code} - {ticket_res.text}"
    ticket = ticket_res.json()["ticket"]

    # First connection consumes ticket
    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={ticket}") as ws:
        ready = ws.receive_json()
        assert ready["type"] == "connection.ready"

    # Second connection attempt with the exact same ticket MUST fail
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={ticket}"):
            pass
    assert exc_info.value.code == RealtimeCloseCode.UNAUTHORIZED_TICKET.value


def test_websocket_malformed_and_unsupported_frames(ws_client: TestClient):
    user_info = sync_register_user(ws_client, prefix="malform_user")
    token = user_info["token"]

    ticket_res = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ticket_res.status_code == 200, f"Ticket error: {ticket_res.status_code} - {ticket_res.text}"
    ticket = ticket_res.json()["ticket"]

    with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={ticket}") as ws:
        _ready = ws.receive_json()

        # Send non-JSON text
        ws.send_text("this is not json at all!")
        err1 = ws.receive_json()
        assert err1["type"] == "error"
        assert err1["payload"]["code"] == RealtimeErrorCode.VALIDATION_ERROR.value

        # Send JSON missing required envelope fields (missing 'type')
        ws.send_text('{"id": "123", "payload": {}}')
        err2 = ws.receive_json()
        assert err2["type"] == "error"
        assert err2["payload"]["code"] == RealtimeErrorCode.VALIDATION_ERROR.value

        # Send unsupported future event type in foundational slice
        ws.send_json({"type": "world.unsupported_action", "id": "test_id", "payload": {}})
        err3 = ws.receive_json()
        assert err3["type"] == "error"
        assert err3["payload"]["code"] == RealtimeErrorCode.FORBIDDEN.value
        assert err3["payload"]["echo_id"] == "test_id"


def test_websocket_frame_size_limit_exceeded(ws_client: TestClient):
    user_info = sync_register_user(ws_client, prefix="large_frame")
    token = user_info["token"]

    ticket_res = ws_client.post(
        "/api/v1/realtime/ticket",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ticket_res.status_code == 200, f"Ticket error: {ticket_res.status_code} - {ticket_res.text}"
    ticket = ticket_res.json()["ticket"]

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with ws_client.websocket_connect(f"/api/v1/realtime/ws?ticket={ticket}") as ws:
            _ready = ws.receive_json()
            # Send payload exceeding 128 KB (131,072 bytes)
            giant_payload = "A" * 140000
            ws.send_text(giant_payload)
            # Next read must trigger disconnect
            ws.receive_json()

    assert exc_info.value.code == RealtimeCloseCode.MESSAGE_TOO_BIG.value
