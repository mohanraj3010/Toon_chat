import time
from typing import Optional
import uuid
import jwt
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.core.security import get_password_hash, verify_password, verify_supabase_jwt


def test_password_hashing():
    raw = "MySecretToonPassword123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_supabase_jwt_unconfigured_raises_unauthorized(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", None)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")
    dummy_token = jwt.encode({"sub": str(uuid.uuid4())}, "some-secret-key-that-is-32-bytes!", algorithm="HS256")
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(dummy_token)
    assert "Authentication service is not configured" in str(exc_info.value.message)


def test_supabase_jwt_algorithm_enforcement(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")

    # An attacker tries to send a token with declared alg 'none' or 'RS256'
    token_none = jwt.encode({"sub": "attack"}, key="", algorithm="none")
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(token_none)
    assert "does not match server-configured algorithm" in str(exc_info.value.message)


def _test_issuer() -> Optional[str]:
    return settings.SUPABASE_JWT_ISSUER or (f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL else None)


def test_supabase_jwt_expired_token(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")

    payload = {
        "sub": str(uuid.uuid4()),
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": int(time.time()) - 3600,  # 1 hour in the past
    }
    iss = _test_issuer()
    if iss:
        payload["iss"] = iss
    expired_token = jwt.encode(payload, test_secret, algorithm="HS256")
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(expired_token)
    assert "expired" in str(exc_info.value.message).lower()


def test_supabase_jwt_invalid_audience(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")

    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "wrong-audience",
        "exp": int(time.time()) + 3600,
    }
    iss = _test_issuer()
    if iss:
        payload["iss"] = iss
    token = jwt.encode(payload, test_secret, algorithm="HS256")
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(token)
    assert "audience" in str(exc_info.value.message).lower()


def test_supabase_jwt_invalid_issuer(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "SUPABASE_JWT_ISSUER", "https://valid.supabase.co/auth/v1")

    payload = {
        "sub": str(uuid.uuid4()),
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "iss": "https://attacker.supabase.co/auth/v1",
        "exp": int(time.time()) + 3600,
    }
    token = jwt.encode(payload, test_secret, algorithm="HS256")
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(token)
    assert "issuer" in str(exc_info.value.message).lower()


def test_supabase_jwt_incorrectly_signed(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    wrong_secret = "completely-wrong-secret-key-99999"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")

    payload = {
        "sub": str(uuid.uuid4()),
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": int(time.time()) + 3600,
    }
    iss = _test_issuer()
    if iss:
        payload["iss"] = iss
    bad_sig_token = jwt.encode(payload, wrong_secret, algorithm="HS256")
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(bad_sig_token)
    assert "invalid" in str(exc_info.value.message).lower()


def test_supabase_jwt_valid_verification(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    test_user_id = str(uuid.uuid4())
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")

    payload = {
        "sub": test_user_id,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "exp": int(time.time()) + 3600,
        "email": "toon@example.com",
    }
    iss = _test_issuer()
    if iss:
        payload["iss"] = iss
    token = jwt.encode(payload, test_secret, algorithm="HS256")
    decoded = verify_supabase_jwt(token)
    assert decoded["sub"] == test_user_id
    assert decoded["email"] == "toon@example.com"


def test_supabase_jwt_es256_rejects_hs256_token(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "ES256")
    hs256_token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": settings.SUPABASE_JWT_AUDIENCE, "exp": int(time.time()) + 3600},
        "some-symmetric-secret-key-32-bytes!",
        algorithm="HS256",
    )
    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(hs256_token)
    assert "does not match server-configured algorithm 'ES256'" in str(exc_info.value.message)


def test_supabase_jwt_es256_unconfigured_jwks_raises(monkeypatch):
    from app.core import security
    monkeypatch.setattr(security, "_jwks_client", None)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "ES256")
    monkeypatch.setattr(settings, "SUPABASE_JWKS_URL", None)
    monkeypatch.setattr(settings, "SUPABASE_URL", None)

    # Token with ES256 in header
    header = jwt.get_unverified_header
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": settings.SUPABASE_JWT_AUDIENCE, "exp": int(time.time()) + 3600},
        "not-real-key",
        algorithm="HS256",
    )
    # create fake token with ES256 in unverified header
    import base64
    import json
    fake_header = base64.urlsafe_b64encode(json.dumps({"alg": "ES256", "typ": "JWT"}).encode()).decode().rstrip("=")
    fake_payload = base64.urlsafe_b64encode(json.dumps({"sub": "test", "aud": "authenticated", "exp": int(time.time()) + 3600}).encode()).decode().rstrip("=")
    fake_es256_token = f"{fake_header}.{fake_payload}.fakesig"

    with pytest.raises(UnauthorizedError) as exc_info:
        verify_supabase_jwt(fake_es256_token)
    assert "Authentication service JWKS is not configured" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_cors_preflight(async_client: AsyncClient):
    response = await async_client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_security_headers_enforcement():
    from starlette.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers.get("permissions-policy", "")

    # Test HSTS when forwarded over HTTPS
    https_response = client.get("/health", headers={"X-Forwarded-Proto": "https"})
    assert https_response.status_code == 200
    assert "max-age=31536000" in https_response.headers.get("strict-transport-security", "")
