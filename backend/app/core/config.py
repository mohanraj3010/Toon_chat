from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[".env", "backend/.env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "ToonChat API"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Database Targets: 'local' (default) or 'supabase'
    DB_TARGET: str = "local"
    LOCAL_DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/toonchat_dev"
    SUPABASE_DATABASE_URL: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # CORS
    CORS_ORIGINS: List[str] | str = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://toon-chat.vercel.app",
    ]

    ALLOWED_HOSTS: List[str] | str = ["*"]

    # Supabase Auth Configuration (Production Identity Provider)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    SUPABASE_JWKS_URL: Optional[str] = None
    SUPABASE_JWT_AUDIENCE: str = "authenticated"
    SUPABASE_JWT_ISSUER: Optional[str] = None
    SUPABASE_JWT_ALGORITHM: str = "HS256"

    # Business Rules & Capacities
    GROUP_MAX_MEMBERS: int = 250
    STORY_TTL_HOURS: int = 24

    # Storage & Media Configuration
    STORAGE_BACKEND: str = "local"  # 'local' | 's3' | 'memory'
    LOCAL_STORAGE_DIR: str = "data/storage"
    LOCAL_STORAGE_SECRET: str = "dev_secret_toonchat_storage_key_32_bytes_long"

    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_PUBLIC_ENDPOINT_URL: str = "http://localhost:9000"
    S3_BUCKET_NAME: str = "toonchat-media"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"

    MEDIA_UPLOAD_TTL_SEC: int = 900  # 15 minutes
    MEDIA_DOWNLOAD_TTL_SEC: int = 3600  # 1 hour
    MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_VOICE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB (Phase 13.3A voice limit)
    MAX_VIDEO_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
    MAX_FILE_SIZE_BYTES: int = 26_214_400  # 25 MiB (Phase 13.2)
    MAX_PENDING_UPLOADS_PER_USER: int = 5

    @property
    def effective_database_url(self) -> str:
        """
        Determines the active database URL.
        Defaults reliably to LOCAL_DATABASE_URL unless DB_TARGET is 'supabase'
        and a SUPABASE_DATABASE_URL is provided.
        """
        if self.DB_TARGET.lower() == "supabase" and self.SUPABASE_DATABASE_URL:
            return self.SUPABASE_DATABASE_URL
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return self.LOCAL_DATABASE_URL

    @property
    def is_cloud_target(self) -> bool:
        return self.DB_TARGET.lower() == "supabase" and bool(self.SUPABASE_DATABASE_URL)

    def get_masked_connection_info(self, url: Optional[str] = None) -> Dict[str, Any]:
        """
        Safely extracts non-sensitive connection metadata without ever exposing credentials.
        """
        target_url = url or self.effective_database_url
        try:
            parsed = urlsplit(target_url)
            username = parsed.username or "none"
            masked_user = (
                username[:3] + "****" + username[-4:] if len(username) > 8 else "***"
            )
            return {
                "target": "supabase" if "supabase" in (parsed.hostname or "") else "local",
                "scheme": parsed.scheme,
                "host": parsed.hostname,
                "port": parsed.port,
                "database": parsed.path.lstrip("/"),
                "masked_user": masked_user,
                "is_supabase_pooler": "pooler.supabase" in (parsed.hostname or ""),
                "is_supabase_direct": ".supabase.co" in (parsed.hostname or ""),
            }
        except Exception as e:
            return {"error": f"Unable to parse connection URL: {str(e)}"}

    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", mode="after")
    @classmethod
    def assemble_origins_and_hosts(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v]
        return []


settings = Settings()
