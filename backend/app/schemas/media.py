from datetime import datetime
from typing import Dict, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class MediaInitiateUploadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    media_type: str = Field(..., description="'image' | 'voice' | 'video' | 'file'")
    content_type: str = Field(..., description="MIME type, e.g. 'image/png'")
    filename: str = Field(..., min_length=1, max_length=255, description="Client filename with extension")
    size_bytes: int = Field(..., gt=0, description="Declared file size in bytes")


class MediaInitiateUploadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    media_id: uuid.UUID
    storage_key: str
    upload_url: str
    method: str = "PUT"
    headers: Dict[str, str] = Field(default_factory=dict)
    expires_at: datetime
    max_size_bytes: int


class MediaConfirmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: uuid.UUID
    uploader_id: uuid.UUID
    storage_key: str
    media_type: str
    mime_type: str
    size_bytes: int
    status: str
    sha256_hash: Optional[str] = None
    created_at: datetime
    metadata_json: Optional[Dict] = None


class MediaUrlResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    media_id: uuid.UUID
    download_url: str
    expires_in_seconds: int
    content_type: str
