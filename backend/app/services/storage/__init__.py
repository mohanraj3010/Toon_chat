from typing import Optional
from app.core.config import settings
from app.services.storage.base import (
    IStorageService,
    StorageError,
    StorageNotFoundError,
    StorageVerificationError,
    StoredObjectMetadata,
    UploadTarget,
)
from app.services.storage.local import LocalStorageService
from app.services.storage.s3 import S3StorageService
from app.services.storage.memory import MemoryStorageService

_global_storage_instance: Optional[IStorageService] = None


def get_storage_service(backend: Optional[str] = None) -> IStorageService:
    """
    Factory returning the configured storage service instance.
    Defaults to settings.STORAGE_BACKEND ('local', 's3', or 'memory').
    """
    global _global_storage_instance
    target_backend = (backend or settings.STORAGE_BACKEND).lower()

    if target_backend == "memory":
        return MemoryStorageService()
    elif target_backend == "s3":
        return S3StorageService()
    else:
        if _global_storage_instance is None or not isinstance(_global_storage_instance, LocalStorageService):
            _global_storage_instance = LocalStorageService()
        return _global_storage_instance


__all__ = [
    "IStorageService",
    "UploadTarget",
    "StoredObjectMetadata",
    "StorageError",
    "StorageNotFoundError",
    "StorageVerificationError",
    "LocalStorageService",
    "S3StorageService",
    "MemoryStorageService",
    "get_storage_service",
]
