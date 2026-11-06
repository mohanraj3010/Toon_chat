"""
Phase 14 Security Remediation Regression Test Suite
Verifies remediations for:
- SEC-08: Public profile data exposure & IDOR prevention (no email/settings, requires auth).
- SEC-09: Database error detail sanitization (no raw exception strings leaked in HTTP 500).
- SEC-10: Content-Security-Policy (CSP) enforcement.
- SEC-11: Profile update string length bounds on status and mood.
- SEC-12: Permissions-Policy microphone directive allows self-origin recording.
- SEC-13: Rate limiter dependency attached to user search endpoints.
"""

from datetime import datetime, timezone
import inspect
import uuid
import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.deps import rate_limit_auth, require_active_user
from app.main import SecurityHeadersMiddleware
from app.models.avatar import Avatar
from app.models.user import Profile, User, UserSettings
from app.schemas.user import PublicProfileResponse, UpdateProfileRequest
from app.services.auth_service import AuthService


# =========================================================================
# 1. SEC-08: Public Profile Data Exposure & IDOR Protection
# =========================================================================

def test_public_profile_response_excludes_sensitive_fields():
    """Verifies that PublicProfileResponse schema never includes email or settings."""
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    mock_profile = Profile(
        id=uuid.uuid4(),
        user_id=user_id,
        display_name="Luna Cartoon",
        bio="Drawing adventures in Maple Park!",
        vibe_text="Creative & Playful ✨",
        status="online",
        character_base=2,
        avatar_url="https://storage.toonchat.com/avatar/luna.png",
        created_at=now,
        updated_at=now,
    )
    mock_avatar = Avatar(
        id=uuid.uuid4(),
        user_id=user_id,
        version=1,
        is_current=True,
        config={"name": "Luna", "hairColor": "purple"},
    )
    mock_settings = UserSettings(
        id=uuid.uuid4(),
        user_id=user_id,
        who_can_message="everyone",
        who_can_see_status="everyone",
        find_by_email=True,
        find_by_phone=True,
        show_reading_activity=True,
        two_factor_enabled=True,
    )
    mock_user = User(
        id=user_id,
        username="luna_star",
        email="private_luna@example.com",
        is_active=True,
        created_at=now,
    )
    mock_user.profile = mock_profile
    mock_user.avatars = [mock_avatar]
    mock_user.settings = mock_settings

    # Build public profile response
    pub_res = AuthService.build_public_user_response(mock_user)
    serialized = pub_res.model_dump(by_alias=True)

    # 1. Public fields must be present and correctly populated
    assert serialized["id"] == user_id
    assert serialized["username"] == "luna_star"
    assert serialized["displayName"] == "Luna Cartoon"
    assert serialized["bio"] == "Drawing adventures in Maple Park!"
    assert serialized["vibeText"] == "Creative & Playful ✨"
    assert serialized["status"] == "online"
    assert serialized["characterBase"] == 2
    assert serialized["avatarUrl"] == "https://storage.toonchat.com/avatar/luna.png"
    assert serialized["avatar"]["name"] == "Luna"

    # 2. Sensitive fields MUST NOT exist in schema or serialized output
    assert "email" not in serialized
    assert "settings" not in serialized
    assert "password_hash" not in serialized
    assert not hasattr(pub_res, "email")
    assert not hasattr(pub_res, "settings")


def test_get_user_profile_route_requires_auth_and_uses_public_schema():
    """Verifies that the route /users/{username_or_id} enforces require_active_user and returns PublicProfileResponse."""
    from app.api.v1.routers.users import router

    target_route = None
    for r in router.routes:
        if getattr(r, "path", None) == "/users/{username_or_id}":
            target_route = r
            break

    assert target_route is not None, "Route /users/{username_or_id} not registered"
    assert target_route.response_model == PublicProfileResponse

    # Ensure require_active_user is present in route dependencies
    dep_callables = [d.call for d in target_route.dependant.dependencies]
    assert require_active_user in dep_callables, "Route /users/{username_or_id} must require authenticated active user"


# =========================================================================
# 2. SEC-11: String Length Constraints on Profile Updates
# =========================================================================

def test_update_profile_request_length_validation():
    """Verifies that status (>20) and mood (>30) are rejected by schema validation."""
    # 1. Valid boundaries succeed
    valid_req = UpdateProfileRequest(
        status="S" * 20,
        mood="M" * 30,
        display_name="Valid Name",
        bio="Valid Bio",
    )
    assert len(valid_req.status) == 20
    assert len(valid_req.mood) == 30

    # 2. Status exceeding 20 chars fails validation
    with pytest.raises(ValidationError) as exc1:
        UpdateProfileRequest(status="S" * 21)
    errors1 = exc1.value.errors()
    assert any("status" in e["loc"] and "string_too_long" in e["type"] for e in errors1)

    # 3. Mood exceeding 30 chars fails validation
    with pytest.raises(ValidationError) as exc2:
        UpdateProfileRequest(mood="M" * 31)
    errors2 = exc2.value.errors()
    assert any("mood" in e["loc"] and "string_too_long" in e["type"] for e in errors2)


# =========================================================================
# 3. SEC-10 & SEC-12: Security Headers & Permissions-Policy Configuration
# =========================================================================

def test_security_headers_and_permissions_policy():
    """Verifies CSP, Permissions-Policy, nosniff, and frame-options in SecurityHeadersMiddleware."""
    src = inspect.getsource(SecurityHeadersMiddleware.dispatch)

    # SEC-10: Strict Content-Security-Policy
    assert 'response.headers["Content-Security-Policy"] = "default-src \'self\'; frame-ancestors \'none\'; object-src \'none\'; base-uri \'self\';"' in src

    # SEC-12: Permissions-Policy permits microphone for self-origin voice messages
    assert 'response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"' in src

    # Standard security headers
    assert 'response.headers["X-Content-Type-Options"] = "nosniff"' in src
    assert 'response.headers["X-Frame-Options"] = "DENY"' in src
    assert 'response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"' in src
    assert 'Strict-Transport-Security' in src


# =========================================================================
# 4. SEC-09: Database Error Sanitization
# =========================================================================

def test_database_error_detail_sanitized():
    """Verifies that database failure details in deps.py and users.py do not leak raw exceptions."""
    from app.api.v1.routers import users
    import app.deps as deps

    # Verify users.py does not leak raw exception
    source = inspect.getsource(users.list_or_search_users)
    assert "detail=f\"Database error querying users: {str(exc)}\"" not in source
    assert "An unexpected database error occurred while querying users." in source

    # Verify deps.py does not leak raw exception
    deps_source = inspect.getsource(deps.get_current_user_optional)
    assert "detail=f\"Database error loading user: {str(exc)}\"" not in deps_source
    assert "An unexpected database error occurred while loading user." in deps_source


# =========================================================================
# 5. SEC-13: Rate Limit User Search Endpoints
# =========================================================================

def test_user_search_endpoints_have_rate_limiter():
    """Verifies that GET /users and GET /users/search include rate_limit_auth dependency."""
    from app.api.v1.routers.users import router

    found_users_route = False
    found_search_route = False

    for route in router.routes:
        path = getattr(route, "path", None)
        if path == "/users":
            found_users_route = True
            dep_callables = [d.dependency for d in route.dependencies]
            assert rate_limit_auth in dep_callables, "GET /users missing rate_limit_auth"
        elif path == "/users/search":
            found_search_route = True
            dep_callables = [d.dependency for d in route.dependencies]
            assert rate_limit_auth in dep_callables, "GET /users/search missing rate_limit_auth"

    assert found_users_route, "Route /users not found on router"
    assert found_search_route, "Route /users/search not found on router"
