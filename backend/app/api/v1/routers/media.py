import os
from typing import Optional
from urllib.parse import unquote
import uuid
from fastapi import APIRouter, Depends, Header, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import VOICE_EXTENSION_TO_MIME
from app.core.errors import BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError
from app.deps import get_db, require_active_user
from app.models.user import User
from app.schemas.media import (
    MediaConfirmResponse,
    MediaInitiateUploadRequest,
    MediaInitiateUploadResponse,
    MediaUrlResponse,
)
from app.services.media_service import media_service
from app.services.media_validator import sanitize_filename
from app.services.storage import LocalStorageService, get_storage_service

router = APIRouter(prefix="/media", tags=["media"])


@router.post(
    "/upload/initiate",
    response_model=MediaInitiateUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def initiate_media_upload(
    req: MediaInitiateUploadRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MediaInitiateUploadResponse:
    """
    Initiates a media upload session. Validates size limits, MIME allowlist, and user quotas.
    Returns a short-lived authorized upload target (PUT).
    """
    return await media_service.initiate_upload(db, current_user.id, req)


@router.post(
    "/{media_id}/confirm",
    response_model=MediaConfirmResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm_media_upload(
    media_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MediaConfirmResponse:
    """
    Verifies actual presence, byte size, and file signature in storage.
    Transitions upload state from 'pending_upload' to 'ready'.
    """
    return await media_service.confirm_upload(db, current_user.id, media_id)


@router.get(
    "/{media_id}/url",
    response_model=MediaUrlResponse,
    status_code=status.HTTP_200_OK,
)
async def get_media_url(
    media_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MediaUrlResponse:
    """
    Returns an authorized, short-lived signed download URL for the target media item.
    Enforces conversation membership access controls.
    """
    download_url, content_type = await media_service.get_media_download_url(db, current_user.id, media_id)
    return MediaUrlResponse(
        media_id=media_id,
        download_url=download_url,
        expires_in_seconds=settings.MEDIA_DOWNLOAD_TTL_SEC,
        content_type=content_type,
    )


@router.get(
    "/{media_id}",
    response_model=MediaConfirmResponse,
    status_code=status.HTTP_200_OK,
)
async def get_media_metadata(
    media_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MediaConfirmResponse:
    """
    Retrieves verified media metadata if caller has authorized access.
    """
    return await media_service.get_media_metadata(db, current_user.id, media_id)


@router.delete(
    "/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_media(
    media_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Deletes media record and purges the stored binary object.
    Only the uploader can delete their media.
    """
    deleted = await media_service.delete_media(db, current_user.id, media_id)
    if not deleted:
        raise NotFoundError("Media item not found.")


# =========================================================================
# Local Storage Endpoints (Active when STORAGE_BACKEND=local or for testing)
# =========================================================================

@router.put(
    "/storage/upload/{storage_key:path}",
    status_code=status.HTTP_200_OK,
)
async def local_storage_upload_handler(
    storage_key: str,
    request: Request,
    token: str = Query(...),
    exp: int = Query(...),
) -> dict:
    """
    Internal handler for direct binary uploads to local storage using HMAC authorization token.
    Simulates direct S3 presigned PUT behavior.
    """
    storage = get_storage_service()
    if not isinstance(storage, LocalStorageService):
        raise BadRequestError("Local storage upload endpoint is only active when STORAGE_BACKEND=local.")

    clean_key = unquote(storage_key)
    if not (storage.validate_token("upload", clean_key, exp, token) or storage.validate_token("upload", storage_key, exp, token)):
        raise UnauthorizedError("Invalid or expired upload authorization token.")

    body_bytes = await request.body()
    if not body_bytes:
        raise BadRequestError("Upload payload is empty.")

    meta = await storage.write_object_bytes(clean_key, body_bytes)
    return {
        "status": "uploaded",
        "storage_key": meta.storage_key,
        "size_bytes": meta.size_bytes,
        "etag": meta.etag,
    }


@router.get(
    "/storage/file/{storage_key:path}",
)
async def local_storage_file_handler(
    storage_key: str,
    token: str = Query(...),
    exp: int = Query(...),
    filename: Optional[str] = Query(None),
    content_type: Optional[str] = Query(None),
) -> Response:
    """
    Serves stored media files with valid HMAC download tokens.
    Guarantees audio files (e.g. .webm, .mp4, .wav voice recordings) are served with canonical audio/* Content-Type.
    """
    storage = get_storage_service()
    if not isinstance(storage, LocalStorageService):
        raise BadRequestError("Local storage file endpoint is only active when STORAGE_BACKEND=local.")

    clean_key = unquote(storage_key)
    if not (storage.validate_token("download", clean_key, exp, token) or storage.validate_token("download", storage_key, exp, token)):
        raise UnauthorizedError("Invalid or expired download authorization token.")

    try:
        data = await storage.read_object_bytes(clean_key)
    except Exception:
        raise NotFoundError("Stored object not found.")

    # Determine Content-Type safely
    _, ext = os.path.splitext(clean_key.lower())
    is_voice = "/voice/" in clean_key.lower() or clean_key.lower().startswith("media/voice/")

    if is_voice:
        inferred_content_type = VOICE_EXTENSION_TO_MIME.get(ext, "audio/webm")
    else:
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".ogg": "audio/ogg",
            ".webm": "video/webm",
            ".m4a": "audio/mp4",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".pdf": "application/pdf",
            ".txt": "text/plain",
            ".zip": "application/zip",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        inferred_content_type = mime_map.get(ext, "application/octet-stream")

    final_content_type = content_type or inferred_content_type

    headers = {
        "Content-Length": str(len(data)),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
    }
    is_doc = ext in (".pdf", ".txt", ".zip", ".doc", ".docx")
    target_filename = unquote(filename) if filename else os.path.basename(clean_key) or f"download{ext}"
    safe_fn = sanitize_filename(target_filename)
    disposition = "attachment" if is_doc else "inline"
    headers["Content-Disposition"] = f'{disposition}; filename="{safe_fn}"'

    return Response(content=data, media_type=final_content_type, headers=headers)
