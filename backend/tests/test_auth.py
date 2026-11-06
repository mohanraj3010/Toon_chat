import time
import uuid
import jwt
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.errors import ForbiddenError
from app.deps import check_resource_ownership
from app.models.user import User


def create_mock_supabase_token(user_id: str, email: str = "toon@example.com", expires_in: int = 3600) -> str:
    secret = settings.SUPABASE_JWT_SECRET or "test-secret-key-32-bytes-long-12345"
    expected_issuer = settings.SUPABASE_JWT_ISSUER or (f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL else None)
    payload = {
        "sub": user_id,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": int(time.time()) + expires_in,
        "email": email,
        "email_confirmed_at": "2026-10-23T00:00:00Z",
    }
    if expected_issuer:
        payload["iss"] = expected_issuer
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture(autouse=True)
def setup_jwt_secret(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")


@pytest.mark.asyncio
async def test_register_and_provision_user(async_client: AsyncClient):
    uid = str(uuid.uuid4())
    unique_email = f"biscuit_{uuid.uuid4().hex[:6]}@toonchat.dev"
    token = create_mock_supabase_token(uid, unique_email)
    payload = {
        "username": f"biscuit_{uuid.uuid4().hex[:6]}",
        "displayName": "Sir Biscuit",
        "email": unique_email,
        "characterBase": 2,
    }

    response = await async_client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"]["username"] == payload["username"]
    assert data["user"]["id"] == uid
    assert data["profile"]["displayName"] == "Sir Biscuit"
    assert data["profile"]["characterBase"] == 2
    assert data["avatar"] is not None
    assert data["avatar"]["name"] == "Luna"



@pytest.mark.asyncio
async def test_register_duplicate_username_conflict(async_client: AsyncClient):
    shared_name = f"duplicate_{uuid.uuid4().hex[:6]}"
    uid1 = str(uuid.uuid4())
    email1 = f"user1_{uuid.uuid4().hex[:6]}@example.com"
    token1 = create_mock_supabase_token(uid1, email1)
    reg1 = {
        "username": shared_name,
        "displayName": "User One",
        "email": email1,
    }
    res1 = await async_client.post(
        "/api/v1/auth/register",
        json=reg1,
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res1.status_code == 201

    # Attempt to register with the same username under a different Supabase ID
    uid2 = str(uuid.uuid4())
    email2 = f"user2_{uuid.uuid4().hex[:6]}@example.com"
    token2 = create_mock_supabase_token(uid2, email2)
    reg2 = {
        "username": shared_name.upper(),  # Test case-insensitivity
        "displayName": "User Two",
        "email": email2,
    }
    res2 = await async_client.post(
        "/api/v1/auth/register",
        json=reg2,
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res2.status_code == 409
    error_data = res2.json()
    assert error_data["code"] == "CONFLICT"
    assert "taken" in error_data["message"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_email_conflict(async_client: AsyncClient):
    shared_email = f"shared_{uuid.uuid4().hex[:6]}@example.com"
    uid1 = str(uuid.uuid4())
    token1 = create_mock_supabase_token(uid1, shared_email)
    res1 = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": f"user_a_{uuid.uuid4().hex[:6]}",
            "displayName": "User A",
            "email": shared_email,
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res1.status_code == 201

    uid2 = str(uuid.uuid4())
    token2 = create_mock_supabase_token(uid2, shared_email)
    res2 = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": f"user_b_{uuid.uuid4().hex[:6]}",
            "displayName": "User B",
            "email": shared_email,
        },
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res2.status_code == 409
    error_data = res2.json()
    assert "email already exists" in error_data["message"].lower()


@pytest.mark.asyncio
async def test_register_reserved_username_rejected(async_client: AsyncClient):
    uid = str(uuid.uuid4())
    email = f"admin_{uuid.uuid4().hex[:6]}@example.com"
    token = create_mock_supabase_token(uid, email)
    res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "admin",
            "displayName": "Fake Admin",
            "email": email,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
    assert "reserved" in res.text.lower()


@pytest.mark.asyncio
async def test_register_idempotency(async_client: AsyncClient):
    uid = str(uuid.uuid4())
    email = f"repeat_{uuid.uuid4().hex[:6]}@example.com"
    token = create_mock_supabase_token(uid, email)
    payload = {
        "username": f"repeat_{uuid.uuid4().hex[:6]}",
        "displayName": "Repeat Toon",
        "email": email,
    }
    # First call
    res1 = await async_client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Second identical call (network retry or re-login provisioning)
    res2 = await async_client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 201
    assert res2.json()["user"]["id"] == uid



@pytest.mark.asyncio
async def test_protected_route_unauthorized(async_client: AsyncClient):
    # No token
    res_none = await async_client.get("/api/v1/auth/me")
    assert res_none.status_code == 401

    # Expired token
    expired_token = create_mock_supabase_token(str(uuid.uuid4()), expires_in=-3600)
    res_expired = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res_expired.status_code == 401

    # Invalid garbage token
    res_garbage = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert res_garbage.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_authorized(async_client: AsyncClient):
    uid = str(uuid.uuid4())
    unique_email = f"citizen_{uuid.uuid4().hex[:6]}@toonchat.dev"
    token = create_mock_supabase_token(uid, unique_email)
    username = f"citizen_{uuid.uuid4().hex[:6]}"

    # Provision user first
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"username": username, "displayName": "Good Citizen", "email": unique_email},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reg_res.status_code == 201

    # Call /api/v1/auth/me
    res_auth_me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_auth_me.status_code == 200
    data = res_auth_me.json()
    assert data["authenticated"] is True
    assert data["user"]["username"] == username
    assert data["profile"]["displayName"] == "Good Citizen"

    # Call /api/v1/me (should also return the real user profile!)
    res_me = await async_client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_me.status_code == 200
    data_me = res_me.json()
    assert data_me["authenticated"] is True
    assert data_me["user"]["username"] == username


@pytest.mark.asyncio
async def test_logout_endpoint(async_client: AsyncClient):
    res = await async_client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    assert "signed out" in res.json()["message"].lower()


@pytest.mark.asyncio
async def test_account_deletion_foundation(async_client: AsyncClient):
    uid = str(uuid.uuid4())
    unique_email = f"leaving_{uuid.uuid4().hex[:6]}@toonchat.dev"
    token = create_mock_supabase_token(uid, unique_email)
    username = f"leaving_{uuid.uuid4().hex[:6]}"

    # Provision
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"username": username, "displayName": "Leaving Soon", "email": unique_email},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reg_res.status_code == 201


    # Delete
    del_res = await async_client.delete(
        "/api/v1/auth/account",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200
    assert "closed" in del_res.json()["message"].lower()

    # Now verify that subsequent authenticated calls fail with 403 or 401
    me_res = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 401 or me_res.status_code == 403


def test_resource_ownership_helper():
    user_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()
    user_a = User(id=user_a_id, username="usera", is_active=True)

    # User A accesses User A's resource -> passes
    check_resource_ownership(user_a, user_a_id)

    # User A tries to access User B's resource -> raises ForbiddenError
    with pytest.raises(ForbiddenError):
        check_resource_ownership(user_a, user_b_id)


@pytest.mark.asyncio
async def test_auth_rate_limiting(async_client: AsyncClient):
    # Firing requests beyond the max threshold triggers 429
    hit_429 = False
    for _ in range(35):
        res = await async_client.post(
            "/api/v1/auth/password/change",
            json={"currentPassword": "old", "newPassword": "newpassword123"},
        )
        if res.status_code == 429:
            hit_429 = True
            data = res.json()
            assert data["code"] == "RATE_LIMIT_EXCEEDED"
            assert "speedy toon" in data["message"].lower()
            break
    assert hit_429 is True

