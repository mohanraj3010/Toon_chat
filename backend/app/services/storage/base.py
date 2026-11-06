import abc
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict


class UploadTarget(BaseModel):
    """Authorized upload destination and parameters for client upload."""
    model_config = ConfigDict(extra="forbid")

    storage_key: str
    upload_url: str
    method: str = "PUT"
    headers: Dict[str, str] = {}
    expires_in_seconds: int


class StoredObjectMetadata(BaseModel):
    """Metadata describing a verified object in storage."""
    model_config = ConfigDict(extra="forbid")

    storage_key: str
    size_bytes: int
    content_type: str
    etag: Optional[str] = None
    sha256_hash: Optional[str] = None


class StorageError(Exception):
    """Base exception for storage operations."""
    def __init__(self, message: str, details: Optional[Dict[str, str]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class StorageNotFoundError(StorageError):
    """Raised when an object does not exist in storage."""
    pass


class StorageVerificationError(StorageError):
    """Raised when an object fails size, MIME, or signature verification."""
    pass


class IStorageService(abc.ABC):
    """Provider-independent storage service interface."""

    @abc.abstractmethod
    async def create_upload_target(
        self,
        storage_key: str,
        content_type: str,
        max_size_bytes: int,
        expires_in_seconds: int = 900,
    ) -> UploadTarget:
        """Generates an authorized upload target (e.g. presigned PUT URL)."""
        pass

    @abc.abstractmethod
    async def verify_object(
        self,
        storage_key: str,
        expected_size: Optional[int] = None,
        expected_content_type: Optional[str] = None,
    ) -> StoredObjectMetadata:
        """Verifies existence, size, and metadata of an object in storage."""
        pass

    @abc.abstractmethod
    async def create_download_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 3600,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> str:
        """Generates a short-lived authorized download URL."""
        pass

    @abc.abstractmethod
    async def delete_object(self, storage_key: str) -> bool:
        """Deletes an object from storage."""
        pass

    @abc.abstractmethod
    async def read_object_bytes(
        self,
        storage_key: str,
        max_bytes: Optional[int] = None,
    ) -> bytes:
        """Reads initial bytes of the object for magic signature verification."""
        pass
