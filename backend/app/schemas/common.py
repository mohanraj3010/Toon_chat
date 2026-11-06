from typing import Any, Dict
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str = "ok"


class ReadyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str = "ready"
    db: str = "connected"


class ErrorEnvelope(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = {}
    request_id: str


class MessageResponse(BaseModel):
    message: str
