import hashlib
import hmac
import os
import time
from pathlib import Path
from typing import Optional
from urllib.parse import quote, unquote

from app.core.config import settings
from app.services.storage.base import (
    IStorageService,
    StorageError,
    StorageNotFoundError,
    StoredObjectMetadata,
    UploadTarget,
)


def generate_hmac_token(secret: str, message: str) -> str:
    """Generates a secure HMAC-SHA256 hex digest for storage URL tokens."""
    return hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_hmac_token(secret: str, message: str, token: str) -> bool:
    """Safely verifies HMAC-SHA256 token using constant-time comparison."""
    expected = generate_hmac_token(secret, message)
    return hmac.compare_digest(expected, token)


class LocalStorageService(IStorageService):
    """
    Local filesystem storage provider for development and testing.
    Uses HMAC-signed URLs to authorize binary upload (PUT) and download (GET) endpoints.
    """

    def __init__(
        self,
        base_dir: Optional[str] = None,
        secret: Optional[str] = None,
        base_url: str = "/api/v1/media/storage",
    ):
        self.base_dir = Path(base_dir or settings.LOCAL_STORAGE_DIR).resolve()
        self.secret = secret or settings.LOCAL_STORAGE_SECRET
        self.base_url = base_url.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, storage_key: str) -> Path:
        """Resolves storage_key against base_dir preventing path traversal."""
        clean_key = unquote(storage_key).strip().lstrip("/\\")
        target_path = (self.base_dir / clean_key).resolve()
        # Security: prevent directory traversal outside base_dir using strict path containment
        if target_path != self.base_dir and self.base_dir not in target_path.parents:
            raise StorageError(f"Path traversal detected for key '{storage_key}'")
        return target_path

    def generate_token(self, action: str, storage_key: str, expires_at: int) -> str:
        clean_key = unquote(storage_key)
        msg = f"{action}:{clean_key}:{expires_at}"
        return generate_hmac_token(self.secret, msg)

    def validate_token(self, action: str, storage_key: str, expires_at: int, token: str) -> bool:
        if time.time() > expires_at:
            return False
        clean_key = unquote(storage_key)
        msg = f"{action}:{clean_key}:{expires_at}"
        if verify_hmac_token(self.secret, msg, token):
            return True
        raw_msg = f"{action}:{storage_key}:{expires_at}"
        return verify_hmac_token(self.secret, raw_msg, token)

    async def create_upload_target(
        self,
        storage_key: str,
        content_type: str,
        max_size_bytes: int,
        expires_in_seconds: int = 900,
    ) -> UploadTarget:
        expires_at = int(time.time()) + expires_in_seconds
        token = self.generate_token("upload", storage_key, expires_at)
        encoded_key = quote(unquote(storage_key), safe="/")
        upload_url = f"{self.base_url}/upload/{encoded_key}?token={token}&exp={expires_at}"

        return UploadTarget(
            storage_key=storage_key,
            upload_url=upload_url,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_in_seconds=expires_in_seconds,
        )

    async def verify_object(
        self,
        storage_key: str,
        expected_size: Optional[int] = None,
        expected_content_type: Optional[str] = None,
    ) -> StoredObjectMetadata:
        path = self._resolve_path(storage_key)
        if not path.is_file():
            raise StorageNotFoundError(f"Object '{storage_key}' does not exist in local storage.")

        stat = path.stat()
        actual_size = stat.st_size

        if expected_size is not None and actual_size != expected_size:
            raise StorageError(
                f"Object size mismatch: expected {expected_size} bytes, got {actual_size} bytes."
            )

        # Compute SHA-256 hash of object
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        digest = sha256.hexdigest()

        return StoredObjectMetadata(
            storage_key=storage_key,
            size_bytes=actual_size,
            content_type=expected_content_type or "application/octet-stream",
            etag=f'"{digest}"',
            sha256_hash=digest,
        )

    async def create_download_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 3600,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> str:
        path = self._resolve_path(storage_key)
        if not path.is_file():
            raise StorageNotFoundError(f"Object '{storage_key}' not found.")

        expires_at = int(time.time()) + expires_in_seconds
        token = self.generate_token("download", storage_key, expires_at)
        encoded_key = quote(unquote(storage_key), safe="/")
        url = f"{self.base_url}/file/{encoded_key}?token={token}&exp={expires_at}"
        if filename:
            url += f"&filename={quote(filename)}"
        if content_type:
            url += f"&content_type={quote(content_type)}"
        return url

    async def delete_object(self, storage_key: str) -> bool:
        path = self._resolve_path(storage_key)
        if path.is_file():
            try:
                path.unlink()
                return True
            except OSError as ex:
                raise StorageError(f"Failed to delete '{storage_key}': {ex}")
        return False

    async def read_object_bytes(
        self,
        storage_key: str,
        max_bytes: Optional[int] = None,
    ) -> bytes:
        path = self._resolve_path(storage_key)
        if not path.is_file():
            raise StorageNotFoundError(f"Object '{storage_key}' not found.")
        with open(path, "rb") as f:
            if max_bytes is not None:
                return f.read(max_bytes)
            return f.read()

    async def write_object_bytes(self, storage_key: str, data: bytes) -> StoredObjectMetadata:
        """Helper for binary upload handling."""
        path = self._resolve_path(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)

        sha256 = hashlib.sha256(data).hexdigest()
        return StoredObjectMetadata(
            storage_key=storage_key,
            size_bytes=len(data),
            content_type="application/octet-stream",
            etag=f'"{sha256}"',
            sha256_hash=sha256,
        )
