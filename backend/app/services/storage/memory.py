import hashlib
from typing import Dict, Optional, Tuple
from app.services.storage.base import (
    IStorageService,
    StorageNotFoundError,
    StoredObjectMetadata,
    UploadTarget,
)


class MemoryStorageService(IStorageService):
    """
    Deterministic in-memory storage service for fast unit tests.
    Does not require disk I/O, network sockets, or running services.
    """

    def __init__(self):
        # storage_key -> (bytes_data, content_type)
        self._objects: Dict[str, Tuple[bytes, str]] = {}
        # Track targets created
        self._targets: Dict[str, UploadTarget] = {}

    def set_object(self, storage_key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        """Test helper to simulate pre-existing uploaded object."""
        self._objects[storage_key] = (data, content_type)

    def has_object(self, storage_key: str) -> bool:
        return storage_key in self._objects

    def clear(self) -> None:
        self._objects.clear()
        self._targets.clear()

    async def create_upload_target(
        self,
        storage_key: str,
        content_type: str,
        max_size_bytes: int,
        expires_in_seconds: int = 900,
    ) -> UploadTarget:
        target = UploadTarget(
            storage_key=storage_key,
            upload_url=f"memory://upload/{storage_key}",
            method="PUT",
            headers={"Content-Type": content_type},
            expires_in_seconds=expires_in_seconds,
        )
        self._targets[storage_key] = target
        return target

    async def verify_object(
        self,
        storage_key: str,
        expected_size: Optional[int] = None,
        expected_content_type: Optional[str] = None,
    ) -> StoredObjectMetadata:
        if storage_key not in self._objects:
            raise StorageNotFoundError(f"Object '{storage_key}' not found in MemoryStorage.")

        data, c_type = self._objects[storage_key]
        actual_size = len(data)

        if expected_size is not None and actual_size != expected_size:
            from app.services.storage.base import StorageError
            raise StorageError(
                f"Size mismatch: expected {expected_size} bytes, got {actual_size} bytes."
            )

        sha256 = hashlib.sha256(data).hexdigest()
        return StoredObjectMetadata(
            storage_key=storage_key,
            size_bytes=actual_size,
            content_type=expected_content_type or c_type,
            etag=f'"{sha256}"',
            sha256_hash=sha256,
        )

    async def create_download_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 3600,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> str:
        if storage_key not in self._objects:
            raise StorageNotFoundError(f"Object '{storage_key}' not found.")
        url = f"memory://download/{storage_key}?exp={expires_in_seconds}"
        if filename:
            from urllib.parse import quote
            url += f"&filename={quote(filename)}"
        if content_type:
            from urllib.parse import quote
            url += f"&content_type={quote(content_type)}"
        return url

    async def delete_object(self, storage_key: str) -> bool:
        if storage_key in self._objects:
            del self._objects[storage_key]
            return True
        return False

    async def read_object_bytes(
        self,
        storage_key: str,
        max_bytes: Optional[int] = None,
    ) -> bytes:
        if storage_key not in self._objects:
            raise StorageNotFoundError(f"Object '{storage_key}' not found.")
        data, _ = self._objects[storage_key]
        if max_bytes is not None:
            return data[:max_bytes]
        return data
