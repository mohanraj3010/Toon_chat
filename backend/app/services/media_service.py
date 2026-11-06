from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import BadRequestError, ForbiddenError, NotFoundError, RateLimitError
from app.models.chat import ConversationMember, Message
from app.models.media import Media
from app.schemas.media import MediaInitiateUploadRequest, MediaInitiateUploadResponse
from app.services.media_validator import (
    get_max_size_for_media_type,
    parse_and_normalize_mime_type,
    sanitize_filename,
    validate_magic_signature,
    validate_upload_initiation,
)
from app.services.storage import IStorageService, StorageError, StorageNotFoundError, get_storage_service


class MediaService:
    """Service managing media lifecycle, storage verification, and authorization."""

    def __init__(self, storage: Optional[IStorageService] = None):
        self._storage = storage

    @property
    def storage(self) -> IStorageService:
        if self._storage is None:
            self._storage = get_storage_service()
        return self._storage

    async def initiate_upload(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        req: MediaInitiateUploadRequest,
    ) -> MediaInitiateUploadResponse:
        """
        Validates media parameters and issues a short-lived upload authorization.
        Creates a 'pending_upload' record in PostgreSQL.
        """
        now = datetime.now(timezone.utc)

        # 1. Enforce user outstanding upload quota
        quota_stmt = select(func.count(Media.id)).where(
            Media.uploader_id == user_id,
            Media.status == "pending_upload",
            Media.expires_at > now,
        )
        active_pending_count = (await db.execute(quota_stmt)).scalar() or 0
        if active_pending_count >= settings.MAX_PENDING_UPLOADS_PER_USER:
            raise RateLimitError(
                f"Too many outstanding pending uploads ({active_pending_count}). Please complete or wait for previous uploads to expire.",
                details={"max_pending": settings.MAX_PENDING_UPLOADS_PER_USER},
            )

        # 2. Validate MIME, extension consistency, and size limit
        clean_filename = sanitize_filename(req.filename)
        base_mime, mime_params = parse_and_normalize_mime_type(req.content_type)
        ext = validate_upload_initiation(
            media_type=req.media_type,
            content_type=req.content_type,
            filename=clean_filename,
            declared_size_bytes=req.size_bytes,
        )

        media_id = uuid.uuid4()
        random_token = secrets.token_hex(8)
        storage_key = f"media/{req.media_type.strip().lower()}/{user_id}/{media_id}/{random_token}{ext}"

        expires_at = now + timedelta(seconds=settings.MEDIA_UPLOAD_TTL_SEC)
        max_size = get_max_size_for_media_type(req.media_type.strip().lower())

        # 3. Create pending record
        media_metadata = {"original_filename": clean_filename}
        if mime_params:
            media_metadata["mime_params"] = mime_params

        media = Media(
            id=media_id,
            uploader_id=user_id,
            storage_key=storage_key,
            mime_type=base_mime,
            size_bytes=req.size_bytes,
            media_type=req.media_type.strip().lower(),
            status="pending_upload",
            expires_at=expires_at,
            metadata_json=media_metadata,
            created_at=now,
            updated_at=now,
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)

        # 4. Request authorized upload target from storage service
        upload_target = await self.storage.create_upload_target(
            storage_key=storage_key,
            content_type=base_mime,
            max_size_bytes=max_size,
            expires_in_seconds=settings.MEDIA_UPLOAD_TTL_SEC,
        )

        return MediaInitiateUploadResponse(
            media_id=media.id,
            storage_key=media.storage_key,
            upload_url=upload_target.upload_url,
            method=upload_target.method,
            headers=upload_target.headers,
            expires_at=expires_at,
            max_size_bytes=max_size,
        )

    async def confirm_upload(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> Media:
        """
        Verifies actual file presence, bounds, and signature in storage.
        Transitions state to 'ready' only after server verification.
        """
        stmt = select(Media).where(Media.id == media_id)
        res = await db.execute(stmt)
        media = res.scalars().first()

        if not media:
            raise NotFoundError("Media record not found.", details={"error_subcode": "MEDIA_NOT_FOUND"})

        # Ownership authorization check
        if media.uploader_id != user_id:
            raise ForbiddenError("Cannot confirm an upload owned by another user.", details={"error_subcode": "NOT_OWNER"})

        # Idempotent confirmation: if already confirmed ready, return existing record
        if media.status == "ready":
            return media

        if media.status != "pending_upload":
            raise BadRequestError(
                f"Media record is in status '{media.status}' and cannot be confirmed.",
                details={"status": media.status},
            )

        now = datetime.now(timezone.utc)
        if media.expires_at and now > media.expires_at:
            media.status = "expired"
            media.updated_at = now
            await db.commit()
            raise BadRequestError("Media upload has expired.", details={"error_subcode": "UPLOAD_EXPIRED"})

        # Verify object existence and actual stored metadata
        try:
            obj_meta = await self.storage.verify_object(
                storage_key=media.storage_key,
                expected_content_type=media.mime_type,
            )
        except StorageNotFoundError:
            raise BadRequestError("File has not been uploaded to storage target.", details={"error_subcode": "OBJECT_NOT_FOUND"})
        except StorageError as se:
            raise BadRequestError(f"Storage verification failed: {se.message}", details={"error_subcode": "STORAGE_ERROR"})

        if obj_meta.size_bytes <= 0:
            raise BadRequestError("Uploaded file is empty (0 bytes).", details={"error_subcode": "EMPTY_FILE"})

        max_size = get_max_size_for_media_type(media.media_type)
        if obj_meta.size_bytes > max_size:
            await self.storage.delete_object(media.storage_key)
            media.status = "failed"
            media.updated_at = now
            await db.commit()
            raise BadRequestError(
                f"Uploaded file size ({obj_meta.size_bytes} bytes) exceeds maximum limit ({max_size} bytes).",
                details={"error_subcode": "FILE_TOO_LARGE"},
            )

        # Content signature verification: read magic bytes from storage
        header_bytes = await self.storage.read_object_bytes(media.storage_key, max_bytes=64)
        if not validate_magic_signature(media.mime_type, header_bytes):
            await self.storage.delete_object(media.storage_key)
            media.status = "failed"
            media.updated_at = now
            await db.commit()
            raise BadRequestError(
                "File contents do not match declared MIME format.",
                details={"error_subcode": "MAGIC_SIGNATURE_MISMATCH"},
            )

        # Successful verification -> transition to ready
        media.size_bytes = obj_meta.size_bytes
        media.sha256_hash = obj_meta.sha256_hash or hashlib.sha256(header_bytes).hexdigest()
        media.status = "ready"
        media.expires_at = None
        media.updated_at = now
        await db.commit()
        await db.refresh(media)

        return media

    async def get_media_download_url(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> Tuple[str, str]:
        """
        Authorizes media access and returns a short-lived download URL.
        Enforces conversation membership privacy rules.
        """
        stmt = select(Media).where(Media.id == media_id)
        res = await db.execute(stmt)
        media = res.scalars().first()

        if not media or media.status != "ready":
            # Indistinguishable for privacy: foreign or non-ready media returns 404
            raise NotFoundError("Media item not found or unavailable.", details={"error_subcode": "MEDIA_NOT_FOUND"})

        # Check if media is attached to a message
        msg_stmt = select(Message).where(Message.media_id == media_id, Message.is_deleted.is_(False))
        msg_res = await db.execute(msg_stmt)
        message = msg_res.scalars().first()

        if message is not None:
            # Attached to a message: caller must be an active member of the conversation
            mem_stmt = select(ConversationMember.id).where(
                ConversationMember.conversation_id == message.conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.left_at.is_(None),
            )
            is_member = (await db.execute(mem_stmt)).scalars().first() is not None
            if not is_member:
                raise NotFoundError("Media item not found or unavailable.", details={"error_subcode": "ACCESS_DENIED"})
        else:
            # Unattached media: only the uploader can access prior to sending
            if media.uploader_id != user_id:
                raise NotFoundError("Media item not found or unavailable.", details={"error_subcode": "ACCESS_DENIED"})

        original_filename = None
        if media.metadata_json and isinstance(media.metadata_json, dict):
            original_filename = media.metadata_json.get("original_filename")

        download_url = await self.storage.create_download_url(
            storage_key=media.storage_key,
            expires_in_seconds=settings.MEDIA_DOWNLOAD_TTL_SEC,
            filename=original_filename,
            content_type=media.mime_type,
        )

        return download_url, media.mime_type

    async def get_media_metadata(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> Media:
        """Retrieves verified media metadata if caller is authorized."""
        # Reuse access authorization logic from get_media_download_url
        await self.get_media_download_url(db, user_id, media_id)
        stmt = select(Media).where(Media.id == media_id)
        return (await db.execute(stmt)).scalars().first()

    async def delete_media(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> bool:
        """Deletes media record and purges storage object."""
        stmt = select(Media).where(Media.id == media_id)
        media = (await db.execute(stmt)).scalars().first()

        if not media:
            return False

        if media.uploader_id != user_id:
            raise ForbiddenError("Cannot delete media owned by another user.")

        await self.storage.delete_object(media.storage_key)
        media.status = "deleted"
        media.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return True


media_service = MediaService()
