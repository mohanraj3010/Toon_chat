from datetime import datetime, timedelta, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.chat import Conversation, ConversationMember, Message
from app.models.media import Media
from app.models.user import User
from app.schemas.realtime import ChatSendPayload
from app.services.media_service import media_service
from app.services.message_service import message_service, MessageServiceError
from app.services.storage.memory import MemoryStorageService
from tests.test_auth import create_mock_supabase_token


PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"


@pytest.fixture(autouse=True)
def setup_jwt_secret(monkeypatch):
    test_secret = "test-secret-key-32-bytes-long-12345"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", test_secret)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ALGORITHM", "HS256")


@pytest.fixture(autouse=True)
def use_memory_storage(monkeypatch):
    """Installs deterministic MemoryStorageService for all API tests."""
    mem_storage = MemoryStorageService()
    monkeypatch.setattr(media_service, "_storage", mem_storage)
    return mem_storage


@pytest.fixture
def test_db_session_factory():
    engine = create_async_engine(settings.effective_database_url, poolclass=NullPool)
    return async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def create_test_user(db_factory, username: str, email: str) -> User:
    async with db_factory() as session:
        user = User(
            id=uuid.uuid4(),
            email=email,
            username=username,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def create_test_conversation(db_factory, user_a: User, user_b: User) -> Conversation:
    async with db_factory() as session:
        conv = Conversation(
            id=uuid.uuid4(),
            type="direct",
            direct_user1_id=min(user_a.id, user_b.id),
            direct_user2_id=max(user_a.id, user_b.id),
        )
        session.add(conv)
        await session.flush()

        mem_a = ConversationMember(conversation_id=conv.id, user_id=user_a.id, role="member")
        mem_b = ConversationMember(conversation_id=conv.id, user_id=user_b.id, role="member")
        session.add_all([mem_a, mem_b])
        await session.commit()
        await session.refresh(conv)
        return conv


@pytest.mark.asyncio
async def test_media_initiate_requires_auth(async_client: AsyncClient):
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "pic.png",
            "size_bytes": 1024,
        },
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_media_initiate_valid_and_validation_errors(async_client: AsyncClient, test_db_session_factory):
    user = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token = create_mock_supabase_token(str(user.id), user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Valid initiation
    res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "my_avatar.png",
            "size_bytes": 2048,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "media_id" in data
    assert "upload_url" in data
    assert data["method"] == "PUT"
    assert "storage_key" in data

    # 2. Unsupported MIME
    bad_mime = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "image",
            "content_type": "application/x-sh",
            "filename": "script.sh",
            "size_bytes": 100,
        },
    )
    assert bad_mime.status_code == 400

    # 3. Extension mismatch
    mismatch = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "fake.jpg",
            "size_bytes": 100,
        },
    )
    assert mismatch.status_code == 400

    # 4. Oversized
    huge = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "huge.png",
            "size_bytes": 20 * 1024 * 1024,  # 20MB > 10MB limit
        },
    )
    assert huge.status_code == 400


@pytest.mark.asyncio
async def test_media_initiate_quota_enforcement(async_client: AsyncClient, test_db_session_factory):
    user = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token = create_mock_supabase_token(str(user.id), user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Initiate up to quota limit (settings.MAX_PENDING_UPLOADS_PER_USER = 5)
    for i in range(settings.MAX_PENDING_UPLOADS_PER_USER):
        r = await async_client.post(
            "/api/v1/media/upload/initiate",
            headers=headers,
            json={
                "media_type": "image",
                "content_type": "image/png",
                "filename": f"img_{i}.png",
                "size_bytes": 100,
            },
        )
        assert r.status_code == 201

    # 6th should exceed quota
    overflow = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers=headers,
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "overflow.png",
            "size_bytes": 100,
        },
    )
    assert overflow.status_code == 429


@pytest.mark.asyncio
async def test_media_confirm_security_and_verification(
    async_client: AsyncClient,
    test_db_session_factory,
    use_memory_storage: MemoryStorageService,
):
    user_a = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    user_b = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token_a = create_mock_supabase_token(str(user_a.id), user_a.email)
    token_b = create_mock_supabase_token(str(user_b.id), user_b.email)

    # 1. User A initiates upload
    init_res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "trick.png",
            "size_bytes": len(PNG_BYTES),
        },
    )
    media_id = init_res.json()["media_id"]
    storage_key = init_res.json()["storage_key"]

    # 2. Cross-user confirmation attack: User B tries to confirm User A's media
    cross_res = await async_client.post(
        f"/api/v1/media/{media_id}/confirm",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert cross_res.status_code == 403

    # 3. User A tries to confirm before binary was uploaded to storage
    no_file_res = await async_client.post(
        f"/api/v1/media/{media_id}/confirm",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert no_file_res.status_code == 400
    assert "OBJECT_NOT_FOUND" in no_file_res.text

    # 4. User A uploads file with wrong magic signature (spoofed plain text)
    use_memory_storage.set_object(storage_key, b"THIS IS NOT A VALID PNG FILE", "image/png")
    spoof_res = await async_client.post(
        f"/api/v1/media/{media_id}/confirm",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert spoof_res.status_code == 400
    assert "MAGIC_SIGNATURE_MISMATCH" in spoof_res.text

    # 5. User A initiates fresh upload and uploads REAL PNG bytes
    init2 = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "media_type": "image",
            "content_type": "image/png",
            "filename": "skate.png",
            "size_bytes": len(PNG_BYTES),
        },
    )
    media2_id = init2.json()["media_id"]
    storage_key2 = init2.json()["storage_key"]
    use_memory_storage.set_object(storage_key2, PNG_BYTES, "image/png")

    confirm_res = await async_client.post(
        f"/api/v1/media/{media2_id}/confirm",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert confirm_res.status_code == 200
    c_data = confirm_res.json()
    assert c_data["status"] == "ready"
    assert c_data["size_bytes"] == len(PNG_BYTES)
    assert c_data["sha256_hash"] is not None

    # 6. Duplicate confirmation: safe & idempotent
    dup_res = await async_client.post(
        f"/api/v1/media/{media2_id}/confirm",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_media_download_authorization_and_privacy(
    async_client: AsyncClient,
    test_db_session_factory,
    use_memory_storage: MemoryStorageService,
):
    user_a = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    user_b = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    user_c = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")

    token_a = create_mock_supabase_token(str(user_a.id), user_a.email)
    token_b = create_mock_supabase_token(str(user_b.id), user_b.email)
    token_c = create_mock_supabase_token(str(user_c.id), user_c.email)

    # User A uploads and confirms media
    init_res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"media_type": "image", "content_type": "image/png", "filename": "photo.png", "size_bytes": len(PNG_BYTES)},
    )
    media_id = init_res.json()["media_id"]
    storage_key = init_res.json()["storage_key"]
    use_memory_storage.set_object(storage_key, PNG_BYTES, "image/png")
    await async_client.post(f"/api/v1/media/{media_id}/confirm", headers={"Authorization": f"Bearer {token_a}"})

    # Case 1: Unattached media
    # User A (uploader) can access
    url_a = await async_client.get(f"/api/v1/media/{media_id}/url", headers={"Authorization": f"Bearer {token_a}"})
    assert url_a.status_code == 200
    assert "download_url" in url_a.json()

    # User B (not uploader, not in conversation) gets 404 (indistinguishable privacy policy)
    url_b = await async_client.get(f"/api/v1/media/{media_id}/url", headers={"Authorization": f"Bearer {token_b}"})
    assert url_b.status_code == 404

    # Case 2: Attach media to conversation between User A and User B
    conv = await create_test_conversation(test_db_session_factory, user_a, user_b)
    async with test_db_session_factory() as session:
        msg = Message(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            sender_id=user_a.id,
            sequence=1,
            client_message_id="cmsg_test_media",
            type="image",
            body="Look at this skate!",
            media_id=uuid.UUID(media_id),
            media_url=f"/api/v1/media/{media_id}/url",
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
        )
        session.add(msg)
        await session.commit()

    # User B (active member of conversation) can now access media
    url_b_after = await async_client.get(f"/api/v1/media/{media_id}/url", headers={"Authorization": f"Bearer {token_b}"})
    assert url_b_after.status_code == 200
    assert "download_url" in url_b_after.json()

    # User C (outsider) still gets 404
    url_c = await async_client.get(f"/api/v1/media/{media_id}/url", headers={"Authorization": f"Bearer {token_c}"})
    assert url_c.status_code == 404


@pytest.mark.asyncio
async def test_message_service_media_attachment_validation(
    test_db_session_factory,
    use_memory_storage: MemoryStorageService,
):
    user_a = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    user_b = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    conv = await create_test_conversation(test_db_session_factory, user_a, user_b)

    async with test_db_session_factory() as session:
        # 1. Send with non-existent media_id -> rejected
        fake_media_id = uuid.uuid4()
        with pytest.raises(MessageServiceError) as exc:
            await message_service.allocate_and_insert_message(
                session,
                user_a.id,
                ChatSendPayload(
                    conversation_id=conv.id,
                    client_message_id="cmsg_1",
                    type="image",
                    body="Test",
                    media_id=fake_media_id,
                ),
            )
        assert "not found or not ready" in exc.value.message

        # 2. Create media owned by User B, status = 'ready'
        media_b = Media(
            id=uuid.uuid4(),
            uploader_id=user_b.id,
            storage_key=f"media/test/{uuid.uuid4().hex}.png",
            mime_type="image/png",
            size_bytes=len(PNG_BYTES),
            media_type="image",
            status="ready",
        )
        session.add(media_b)
        await session.commit()

        # User A attempts to send message attaching User B's media -> rejected (403 FORBIDDEN)
        with pytest.raises(MessageServiceError) as exc2:
            await message_service.allocate_and_insert_message(
                session,
                user_a.id,
                ChatSendPayload(
                    conversation_id=conv.id,
                    client_message_id="cmsg_2",
                    type="image",
                    body="Stolen media",
                    media_id=media_b.id,
                ),
            )
        assert "Cannot attach media uploaded by another user" in exc2.value.message

        # 3. Create ready media owned by User A -> send succeeds
        media_a = Media(
            id=uuid.uuid4(),
            uploader_id=user_a.id,
            storage_key=f"media/test/{uuid.uuid4().hex}.png",
            mime_type="image/png",
            size_bytes=len(PNG_BYTES),
            media_type="image",
            status="ready",
        )
        session.add(media_a)
        await session.commit()

        result = await message_service.allocate_and_insert_message(
            session,
            user_a.id,
            ChatSendPayload(
                conversation_id=conv.id,
                client_message_id="cmsg_3",
                type="image",
                body="Valid media send",
                media_id=media_a.id,
            ),
        )
        assert result.message.media_id == media_a.id
        assert result.message.media_url == f"/api/v1/media/{media_a.id}/url"

        # 4. Incompatible media type vs message type: type='file' but media_type='image' -> rejected
        with pytest.raises(MessageServiceError) as exc_type_mismatch:
            await message_service.allocate_and_insert_message(
                session,
                user_a.id,
                ChatSendPayload(
                    conversation_id=conv.id,
                    client_message_id="cmsg_4",
                    type="file",
                    body="Mismatch type",
                    media_id=media_a.id,
                ),
            )
        assert "does not match media type" in exc_type_mismatch.value.message

        # 5. Image/file message without media_id -> rejected
        with pytest.raises(MessageServiceError) as exc_missing_media:
            await message_service.allocate_and_insert_message(
                session,
                user_a.id,
                ChatSendPayload(
                    conversation_id=conv.id,
                    client_message_id="cmsg_5",
                    type="file",
                    body="File without media ID",
                    media_id=None,
                ),
            )
        assert "require a confirmed media_id" in exc_missing_media.value.message

        # 6. Cross-conversation reuse prevention: User A tries to attach media_a to another conversation -> rejected
        user_c = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
        conv2 = await create_test_conversation(test_db_session_factory, user_a, user_c)
        with pytest.raises(MessageServiceError) as exc_cross:
            await message_service.allocate_and_insert_message(
                session,
                user_a.id,
                ChatSendPayload(
                    conversation_id=conv2.id,
                    client_message_id="cmsg_6",
                    type="image",
                    body="Reusing media in another conversation",
                    media_id=media_a.id,
                ),
            )
        assert "already attached to another conversation" in exc_cross.value.message

        # 7. Valid file message attachment
        pdf_bytes = b"%PDF-1.7\r\nSample PDF Document Content"
        media_file = Media(
            id=uuid.uuid4(),
            uploader_id=user_a.id,
            storage_key=f"media/file/{uuid.uuid4().hex}.pdf",
            mime_type="application/pdf",
            size_bytes=len(pdf_bytes),
            media_type="file",
            status="ready",
            metadata_json={"original_filename": "Document.pdf"},
        )
        session.add(media_file)
        await session.commit()

        file_result = await message_service.allocate_and_insert_message(
            session,
            user_a.id,
            ChatSendPayload(
                conversation_id=conv.id,
                client_message_id="cmsg_7",
                type="file",
                body="Document.pdf",
                media_id=media_file.id,
            ),
        )
        assert file_result.message.type == "file"
        assert file_result.message.media_id == media_file.id
        assert file_result.message.media_url == f"/api/v1/media/{media_file.id}/url"


@pytest.mark.asyncio
async def test_file_upload_and_download_flow(
    async_client: AsyncClient,
    test_db_session_factory,
    use_memory_storage: MemoryStorageService,
):
    user_a = await create_test_user(test_db_session_factory, f"u_{uuid.uuid4().hex[:6]}", f"{uuid.uuid4().hex[:6]}@toon.dev")
    token_a = create_mock_supabase_token(str(user_a.id), user_a.email)

    pdf_content = b"%PDF-1.7\r\nHello ToonChat PDF!"

    # 1. Initiate upload for PDF file
    init_res = await async_client.post(
        "/api/v1/media/upload/initiate",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "media_type": "file",
            "content_type": "application/pdf",
            "filename": "ClassNotes_2026.pdf",
            "size_bytes": len(pdf_content),
        },
    )
    assert init_res.status_code == 201
    init_data = init_res.json()
    media_id = init_data["media_id"]
    storage_key = init_data["storage_key"]

    # 2. Upload bytes to storage
    use_memory_storage.set_object(storage_key, pdf_content, "application/pdf")

    # 3. Confirm upload
    confirm_res = await async_client.post(
        f"/api/v1/media/{media_id}/confirm",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "ready"
    assert confirm_data["media_type"] == "file"
    assert confirm_data["metadata_json"]["original_filename"] == "ClassNotes_2026.pdf"

    # 4. Get download URL (includes filename for Content-Disposition)
    url_res = await async_client.get(
        f"/api/v1/media/{media_id}/url",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert url_res.status_code == 200
    url_data = url_res.json()
    assert "download_url" in url_data
    assert "ClassNotes_2026.pdf" in url_data["download_url"]
