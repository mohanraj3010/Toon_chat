import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.constants import ALLOWED_MIME_BY_MEDIA_TYPE, MIME_TO_EXTENSIONS, VOICE_EXTENSION_TO_MIME
from app.core.errors import BadRequestError
from app.models.user import User
from app.services.media_service import media_service
from app.services.media_validator import (
    get_max_size_for_media_type,
    parse_and_normalize_mime_type,
    validate_magic_signature,
    validate_upload_initiation,
)
from app.services.storage.memory import MemoryStorageService
from tests.test_auth import create_mock_supabase_token


# Sample valid container headers
WEBM_HEADER = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x4d\xbb\x8e" + b"\x00" * 40
OGG_HEADER = b"OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00" + b"\x00" * 40
WAV_HEADER = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00" + b"\x00" * 40
MP4_FTYP_HEADER = b"\x00\x00\x00\x1cftypM4A \x00\x00\x02\x00mp42isom" + b"\x00" * 30
AAC_ADTS_HEADER = b"\xff\xf1\x50\x80\x01\x3f\xfc" + b"\x00" * 40
MP3_ID3_HEADER = b"ID3\x04\x00\x00\x00\x00\x00#TIT2\x00\x00\x00\t" + b"\x00" * 40
MP3_SYNC_HEADER = b"\xff\xfb\x90\x64\x00\x00\x00\x00" + b"\x00" * 40


@pytest.fixture(autouse=True)
def setup_jwt_secret(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")


@pytest.fixture(autouse=True)
def use_memory_storage(monkeypatch):
    """Installs deterministic MemoryStorageService for all audio tests."""
    mem_storage = MemoryStorageService()
    monkeypatch.setattr(media_service, "_storage", mem_storage)
    return mem_storage


@pytest.fixture
def test_db_session_factory():
    engine = create_async_engine(settings.effective_database_url, poolclass=NullPool)
    return async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def create_test_user(db_factory, username: str, email: str) -> User:
    from app.services.auth_service import AuthService
    from app.schemas.user import RegisterRequest
    async with db_factory() as session:
        user_id = uuid.uuid4()
        req = RegisterRequest(username=username, display_name=f"User {username.capitalize()}", email=email)
        user = await AuthService.provision_user(session, user_id=user_id, req=req, email=email, is_verified=True)
        await session.commit()
        await session.refresh(user)
        return user


# =========================================================================
# 1. MIME Normalization Unit Tests
# =========================================================================

def test_mime_normalization_audio_types():
    # audio/webm with codecs parameter
    base, params = parse_and_normalize_mime_type("audio/webm;codecs=opus")
    assert base == "audio/webm"
    assert params.get("codecs") == "opus"

    # audio/webm with spaces and quotes
    base, params = parse_and_normalize_mime_type('audio/webm; codecs="opus"')
    assert base == "audio/webm"
    assert params.get("codecs") == "opus"

    # audio/ogg with codecs
    base, params = parse_and_normalize_mime_type("audio/ogg; codecs=opus")
    assert base == "audio/ogg"
    assert params.get("codecs") == "opus"

    # plain audio/ogg
    base, params = parse_and_normalize_mime_type("audio/ogg")
    assert base == "audio/ogg"
    assert params == {}

    # audio/mp4 with codecs
    base, params = parse_and_normalize_mime_type("audio/mp4; codecs=mp4a.40.2")
    assert base == "audio/mp4"
    assert params.get("codecs") == "mp4a.40.2"

    # audio/mpeg
    base, params = parse_and_normalize_mime_type("audio/mpeg")
    assert base == "audio/mpeg"
    assert params == {}

    # audio/wav and aliases
    base, params = parse_and_normalize_mime_type("audio/wav")
    assert base == "audio/wav"
    assert params == {}

    base_alias, _ = parse_and_normalize_mime_type("audio/x-wav")
    assert base_alias == "audio/wav"

    base_alias2, _ = parse_and_normalize_mime_type("audio/wave")
    assert base_alias2 == "audio/wav"


def test_mime_normalization_sanitization():
    # CRLF injection stripped
    base, params = parse_and_normalize_mime_type("audio/webm\r\n;codecs=opus\r\n")
    assert base == "audio/webm"
    assert params.get("codecs") == "opus"

    # Upper case normalized to lower case
    base, params = parse_and_normalize_mime_type("AUDIO/WEBM; CODECS=OPUS")
    assert base == "audio/webm"
    assert params.get("codecs") == "OPUS"

    # Empty and whitespace inputs
    assert parse_and_normalize_mime_type("") == ("", {})
    assert parse_and_normalize_mime_type("   ") == ("", {})


# =========================================================================
# 2. Audio Upload Initiation Validation Tests
# =========================================================================

def test_audio_initiation_valid_containers():
    # WebM voice
    assert validate_upload_initiation("voice", "audio/webm;codecs=opus", "recording.webm", 50000) == ".webm"
    assert validate_upload_initiation("voice", "audio/webm", "recording.weba", 50000) == ".weba"

    # Ogg voice
    assert validate_upload_initiation("voice", "audio/ogg;codecs=opus", "recording.ogg", 50000) == ".ogg"
    assert validate_upload_initiation("voice", "audio/ogg", "recording.opus", 50000) == ".opus"
    assert validate_upload_initiation("voice", "audio/ogg", "recording.oga", 50000) == ".oga"

    # MP4 voice
    assert validate_upload_initiation("voice", "audio/mp4", "recording.m4a", 50000) == ".m4a"
    assert validate_upload_initiation("voice", "audio/mp4;codecs=aac", "recording.mp4", 50000) == ".mp4"
    assert validate_upload_initiation("voice", "audio/mp4", "recording.aac", 50000) == ".aac"

    # MP3 voice
    assert validate_upload_initiation("voice", "audio/mpeg", "recording.mp3", 50000) == ".mp3"

    # WAV voice
    assert validate_upload_initiation("voice", "audio/wav", "recording.wav", 50000) == ".wav"


def test_audio_initiation_size_limits():
    max_voice = get_max_size_for_media_type("voice")
    assert max_voice == 10 * 1024 * 1024  # 10 MB

    # 10MB exact succeeds
    assert validate_upload_initiation("voice", "audio/webm", "test.webm", max_voice) == ".webm"

    # 10MB + 1 byte rejected
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation("voice", "audio/webm", "test.webm", max_voice + 1)
    assert "exceeds maximum permitted limit" in str(exc.value.message)
    assert exc.value.details.get("error_subcode") == "FILE_TOO_LARGE"

    # 0 byte rejected
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation("voice", "audio/webm", "test.webm", 0)
    assert exc.value.details.get("error_subcode") == "INVALID_FILE_SIZE"


def test_audio_initiation_invalid_mime_and_extension_mismatch():
    # Invalid MIME type for voice
    for bad_mime in ["image/png", "video/mp4", "application/pdf", "text/plain", "video/webm"]:
        with pytest.raises(BadRequestError) as exc:
            validate_upload_initiation("voice", bad_mime, "audio.webm", 1000)
        assert exc.value.details.get("error_subcode") == "UNSUPPORTED_MIME_TYPE"

    # Extension mismatch
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation("voice", "audio/webm;codecs=opus", "audio.mp3", 1000)
    assert exc.value.details.get("error_subcode") == "EXTENSION_MIME_MISMATCH"

    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation("voice", "audio/ogg", "audio.wav", 1000)
    assert exc.value.details.get("error_subcode") == "EXTENSION_MIME_MISMATCH"


# =========================================================================
# 3. Magic Byte Signature Verification Tests
# =========================================================================

def test_magic_signature_audio_containers():
    # WebM container (with and without parameters)
    assert validate_magic_signature("audio/webm", WEBM_HEADER) is True
    assert validate_magic_signature("audio/webm;codecs=opus", WEBM_HEADER) is True
    assert validate_magic_signature("audio/webm; codecs=\"opus\"", WEBM_HEADER) is True

    # Ogg container
    assert validate_magic_signature("audio/ogg", OGG_HEADER) is True
    assert validate_magic_signature("audio/ogg;codecs=opus", OGG_HEADER) is True

    # WAV container
    assert validate_magic_signature("audio/wav", WAV_HEADER) is True
    assert validate_magic_signature("audio/x-wav", WAV_HEADER) is True

    # MP4 container & AAC
    assert validate_magic_signature("audio/mp4", MP4_FTYP_HEADER) is True
    assert validate_magic_signature("audio/mp4;codecs=aac", AAC_ADTS_HEADER) is True

    # MP3 container
    assert validate_magic_signature("audio/mpeg", MP3_ID3_HEADER) is True
    assert validate_magic_signature("audio/mpeg", MP3_SYNC_HEADER) is True


def test_magic_signature_spoofed_audio_rejected():
    fake_header = b"NOT_REAL_AUDIO_CONTAINER_DATA"
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"

    # Fake content rejected
    assert validate_magic_signature("audio/webm", fake_header) is False
    assert validate_magic_signature("audio/ogg", fake_header) is False
    assert validate_magic_signature("audio/wav", fake_header) is False
    assert validate_magic_signature("audio/mp4", fake_header) is False
    assert validate_magic_signature("audio/mpeg", fake_header) is False

    # Image masquerading as voice audio rejected
    assert validate_magic_signature("audio/webm", png_header) is False
    assert validate_magic_signature("audio/ogg", png_header) is False
    assert validate_magic_signature("audio/wav", png_header) is False

    # Empty payload rejected
    assert validate_magic_signature("audio/webm", b"") is False


# =========================================================================
# 4. End-to-End API Audio Upload & Confirmation Tests
# =========================================================================

@pytest.mark.asyncio
async def test_api_voice_upload_lifecycle_webm_opus(async_client: AsyncClient, test_db_session_factory, use_memory_storage):
    user = await create_test_user(test_db_session_factory, f"v_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token = create_mock_supabase_token(str(user.id), user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initiate voice upload with browser MIME type 'audio/webm;codecs=opus'
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "voice",
            "content_type": "audio/webm;codecs=opus",
            "filename": "voice_message.webm",
            "size_bytes": len(WEBM_HEADER),
        },
    )
    assert res.status_code == 201
    init_data = res.json()
    media_id = init_data["media_id"]
    storage_key = init_data["storage_key"]
    assert "media/voice/" in storage_key
    assert storage_key.endswith(".webm")

    # 2. Simulate browser uploading binary bytes to storage target
    use_memory_storage.set_object(storage_key, WEBM_HEADER, content_type="audio/webm")

    # 3. Confirm upload
    confirm_res = await async_client.post(f"/api/v1/media/{media_id}/confirm", headers=headers)
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "ready"
    assert confirm_data["media_type"] == "voice"
    assert confirm_data["mime_type"] == "audio/webm"  # Canonical normalized MIME type stored

    # 4. Request download URL
    url_res = await async_client.get(f"/api/v1/media/{media_id}/url", headers=headers)
    assert url_res.status_code == 200
    url_data = url_res.json()
    assert url_data["content_type"] == "audio/webm"
    assert "memory://download" in url_data["download_url"]


@pytest.mark.asyncio
async def test_api_voice_upload_lifecycle_ogg_opus(async_client: AsyncClient, test_db_session_factory, use_memory_storage):
    user = await create_test_user(test_db_session_factory, f"v_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token = create_mock_supabase_token(str(user.id), user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Initiate voice upload with 'audio/ogg;codecs=opus'
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "voice",
            "content_type": "audio/ogg;codecs=opus",
            "filename": "audio_note.opus",
            "size_bytes": len(OGG_HEADER),
        },
    )
    assert res.status_code == 201
    media_id = res.json()["media_id"]
    storage_key = res.json()["storage_key"]

    # Upload valid Ogg binary bytes
    use_memory_storage.set_object(storage_key, OGG_HEADER, content_type="audio/ogg")

    # Confirm
    confirm_res = await async_client.post(f"/api/v1/media/{media_id}/confirm", headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "ready"
    assert confirm_res.json()["mime_type"] == "audio/ogg"


@pytest.mark.asyncio
async def test_api_voice_upload_lifecycle_wav(async_client: AsyncClient, test_db_session_factory, use_memory_storage):
    user = await create_test_user(test_db_session_factory, f"v_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token = create_mock_supabase_token(str(user.id), user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Initiate voice upload with 'audio/wav'
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "voice",
            "content_type": "audio/wav",
            "filename": "mic_recording.wav",
            "size_bytes": len(WAV_HEADER),
        },
    )
    assert res.status_code == 201
    media_id = res.json()["media_id"]
    storage_key = res.json()["storage_key"]

    use_memory_storage.set_object(storage_key, WAV_HEADER, content_type="audio/wav")

    confirm_res = await async_client.post(f"/api/v1/media/{media_id}/confirm", headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "ready"
    assert confirm_res.json()["mime_type"] == "audio/wav"


@pytest.mark.asyncio
async def test_api_voice_spoofed_upload_rejected(async_client: AsyncClient, test_db_session_factory, use_memory_storage):
    user = await create_test_user(test_db_session_factory, f"v_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token = create_mock_supabase_token(str(user.id), user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Initiate valid audio/webm initiation
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "voice",
            "content_type": "audio/webm;codecs=opus",
            "filename": "spoof.webm",
            "size_bytes": 1024,
        },
    )
    assert res.status_code == 201
    media_id = res.json()["media_id"]
    storage_key = res.json()["storage_key"]

    # Attacker uploads fake text instead of WebM
    fake_data = b"This is just a text file renamed to .webm!"
    use_memory_storage.set_object(storage_key, fake_data, content_type="audio/webm")

    # Confirm must fail with 400 MAGIC_SIGNATURE_MISMATCH
    confirm_res = await async_client.post(f"/api/v1/media/{media_id}/confirm", headers=headers)
    assert confirm_res.status_code == 400
    assert confirm_res.json()["details"]["error_subcode"] == "MAGIC_SIGNATURE_MISMATCH"


@pytest.mark.asyncio
async def test_api_voice_unauthorized_confirmation(async_client: AsyncClient, test_db_session_factory, use_memory_storage):
    user_a = await create_test_user(test_db_session_factory, f"va_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    user_b = await create_test_user(test_db_session_factory, f"vb_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")

    token_a = create_mock_supabase_token(str(user_a.id), user_a.email)
    token_b = create_mock_supabase_token(str(user_b.id), user_b.email)

    # User A initiates
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "media_type": "voice",
            "content_type": "audio/webm;codecs=opus",
            "filename": "private_voice.webm",
            "size_bytes": len(WEBM_HEADER),
        },
    )
    assert res.status_code == 201
    media_id = res.json()["media_id"]

    # User B tries to confirm User A's upload -> 403 Forbidden
    confirm_b = await async_client.post(
        f"/api/v1/media/{media_id}/confirm",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert confirm_b.status_code == 403
    assert confirm_b.json()["details"]["error_subcode"] == "NOT_OWNER"
