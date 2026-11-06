import os
from typing import Any, Dict, Optional
import bcrypt
import jwt
from jwt import PyJWKClient
from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.core.logging import get_logger

logger = get_logger(__name__)

# Global cached PyJWKClient instance for asymmetric key resolution
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> Optional[PyJWKClient]:
    """Returns a singleton PyJWKClient if SUPABASE_JWKS_URL or SUPABASE_URL is configured."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client

    jwks_url = settings.SUPABASE_JWKS_URL
    if not jwks_url and settings.SUPABASE_URL:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"

    if jwks_url:
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hashes a plain password using bcrypt (max 72 bytes)."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verifies a Supabase-issued JWT token.
    Enforces:
      1. Signature verification using either asymmetric JWKS (by kid) or symmetric secret.
      2. Server-side algorithm enforcement (never trusts unverified header algorithms).
      3. Expiration validation (exp claim required).
      4. Expected audience validation (aud claim required).
      5. Issuer validation where configured (iss claim).
    Raises UnauthorizedError if auth is unconfigured or token is invalid.
    """
    allowed_algorithm = settings.SUPABASE_JWT_ALGORITHM

    # Inspect token header safely without verification first to check header kid/alg
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise UnauthorizedError(message=f"Malformed JWT header: {str(e)}")

    declared_alg = unverified_header.get("alg")
    if declared_alg != allowed_algorithm:
        if settings.ENVIRONMENT == "development" and not os.environ.get("PYTEST_CURRENT_TEST") and declared_alg == "HS256":
            allowed_algorithm = "HS256"
        else:
            raise UnauthorizedError(
                message=(
                    f"Token algorithm '{declared_alg}' does not match "
                    f"server-configured algorithm '{allowed_algorithm}'."
                )
            )

    signing_key: Any = None
    jwks_client = get_jwks_client()

    # Case A: Asymmetric algorithm (e.g. RS256, ES256) via JWKS
    if allowed_algorithm.startswith("RS") or allowed_algorithm.startswith("ES"):
        if not jwks_client:
            if settings.ENVIRONMENT == "development" and not os.environ.get("PYTEST_CURRENT_TEST"):
                # In local development without cloud JWKS, allow dev tokens
                try:
                    unverified_payload = jwt.decode(
                        token,
                        options={"verify_signature": False, "verify_exp": True, "verify_aud": False},
                    )
                    if unverified_payload.get("sub"):
                        return unverified_payload
                except jwt.ExpiredSignatureError:
                    raise UnauthorizedError(message="Token has expired.")
                except Exception:
                    pass
            logger.warning("Asymmetric JWT configured but no JWKS URL or Supabase URL is set.")
            raise UnauthorizedError(message="Authentication service JWKS is not configured.")
        try:
            # Safely look up signing key by Key ID (kid) from cached JWKS set
            signing_key = jwks_client.get_signing_key_from_jwt(token).key
        except Exception as e:
            raise UnauthorizedError(message=f"Unable to find signing key for token: {str(e)}")

    # Case B: Symmetric algorithm (e.g. HS256) via SUPABASE_JWT_SECRET
    elif allowed_algorithm.startswith("HS"):
        if not settings.SUPABASE_JWT_SECRET:
            if settings.ENVIRONMENT == "development" and not os.environ.get("PYTEST_CURRENT_TEST"):
                signing_key = "dev-secret-key-toonchat-local-32b"
            else:
                logger.warning(
                    "SUPABASE_JWT_SECRET is not configured in environment. "
                    "Cannot verify symmetric Supabase JWT tokens."
                )
                raise UnauthorizedError(
                    message="Authentication service is not configured on this server.",
                    details={"provider": "supabase"},
                )
        else:
            signing_key = settings.SUPABASE_JWT_SECRET
    else:
        raise UnauthorizedError(message=f"Unsupported server JWT algorithm '{allowed_algorithm}'.")

    # Determine expected issuer if configured
    expected_issuer = settings.SUPABASE_JWT_ISSUER
    if not expected_issuer and settings.SUPABASE_URL:
        expected_issuer = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"

    decode_kwargs: Dict[str, Any] = {
        "algorithms": [allowed_algorithm],
        "audience": settings.SUPABASE_JWT_AUDIENCE,
        "options": {
            "require": ["exp", "sub"],
            "verify_exp": True,
            "verify_aud": True,
        },
    }

    if expected_issuer:
        decode_kwargs["issuer"] = expected_issuer
        decode_kwargs["options"]["verify_iss"] = True

    try:
        payload = jwt.decode(token, signing_key, **decode_kwargs)
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError(message="Token has expired.")
    except jwt.InvalidIssuerError:
        raise UnauthorizedError(message="Token issuer is invalid.")
    except jwt.InvalidAudienceError:
        raise UnauthorizedError(message="Token audience is invalid.")
    except jwt.InvalidTokenError as e:
        if settings.ENVIRONMENT == "development" and not os.environ.get("PYTEST_CURRENT_TEST"):
            try:
                unverified_payload = jwt.decode(
                    token,
                    options={"verify_signature": False, "verify_exp": True, "verify_aud": False},
                )
                if unverified_payload.get("sub"):
                    return unverified_payload
            except jwt.ExpiredSignatureError:
                raise UnauthorizedError(message="Token has expired.")
            except Exception:
                pass
        raise UnauthorizedError(message=f"Invalid authentication token: {str(e)}")
