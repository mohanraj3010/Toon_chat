from datetime import datetime, timezone
import hashlib
import hmac
from typing import Dict, Optional
from urllib.parse import quote, urlparse
import httpx

from app.core.config import settings
from app.services.storage.base import (
    IStorageService,
    StorageError,
    StorageNotFoundError,
    StoredObjectMetadata,
    UploadTarget,
)


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _get_signature_key(secret_key: str, date_stamp: str, region_name: str, service_name: str = "s3") -> bytes:
    k_date = _sign(("AWS4" + secret_key).encode("utf-8"), date_stamp)
    k_region = _sign(k_date, region_name)
    k_service = _sign(k_region, service_name)
    k_signing = _sign(k_service, "aws4_request")
    return k_signing


class S3StorageService(IStorageService):
    """
    S3-compatible storage service implementing AWS Signature Version 4.
    Works natively with MinIO, AWS S3, Cloudflare R2, and Supabase Storage S3.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        public_endpoint_url: Optional[str] = None,
        bucket_name: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region: Optional[str] = None,
    ):
        self.endpoint_url = (endpoint_url or settings.S3_ENDPOINT_URL).rstrip("/")
        self.public_endpoint_url = (public_endpoint_url or settings.S3_PUBLIC_ENDPOINT_URL or self.endpoint_url).rstrip("/")
        self.bucket = bucket_name or settings.S3_BUCKET_NAME
        self.access_key = access_key or settings.S3_ACCESS_KEY
        self.secret_key = secret_key or settings.S3_SECRET_KEY
        self.region = region or settings.S3_REGION

    def _build_presigned_url(
        self,
        method: str,
        storage_key: str,
        expires_in_seconds: int,
        headers: Optional[Dict[str, str]] = None,
        public_base: bool = True,
    ) -> str:
        """Constructs an AWS SigV4 presigned URL query string."""
        now = datetime.now(timezone.utc)
        amz_date = now.strftime("%Y%m%dT%H%M%SZ")
        datestamp = now.strftime("%Y%m%d")

        base_endpoint = self.public_endpoint_url if public_base else self.endpoint_url
        parsed_url = urlparse(base_endpoint)
        host_header = parsed_url.netloc

        canonical_uri = f"/{self.bucket}/{quote(storage_key.lstrip('/'), safe='/-_.~')}"
        credential_scope = f"{datestamp}/{self.region}/s3/aws4_request"

        query_params = {
            "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
            "X-Amz-Credential": f"{self.access_key}/{credential_scope}",
            "X-Amz-Date": amz_date,
            "X-Amz-Expires": str(expires_in_seconds),
            "X-Amz-SignedHeaders": "host",
        }

        canonical_headers = f"host:{host_header}\n"
        signed_headers = "host"

        # Canonical query string sorted alphabetically by key
        canonical_query = "&".join(
            f"{quote(k, safe='')}={quote(v, safe='')}"
            for k, v in sorted(query_params.items())
        )

        canonical_request = (
            f"{method}\n"
            f"{canonical_uri}\n"
            f"{canonical_query}\n"
            f"{canonical_headers}\n"
            f"{signed_headers}\n"
            "UNSIGNED-PAYLOAD"
        )

        string_to_sign = (
            f"AWS4-HMAC-SHA256\n"
            f"{amz_date}\n"
            f"{credential_scope}\n"
            f"{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
        )

        signing_key = _get_signature_key(self.secret_key, datestamp, self.region, "s3")
        signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

        return f"{base_endpoint}{canonical_uri}?{canonical_query}&X-Amz-Signature={signature}"

    async def create_upload_target(
        self,
        storage_key: str,
        content_type: str,
        max_size_bytes: int,
        expires_in_seconds: int = 900,
    ) -> UploadTarget:
        upload_url = self._build_presigned_url(
            method="PUT",
            storage_key=storage_key,
            expires_in_seconds=expires_in_seconds,
            public_base=True,
        )
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
        url = self._build_presigned_url(
            method="HEAD",
            storage_key=storage_key,
            expires_in_seconds=60,
            public_base=False,
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.head(url)
            except Exception as e:
                raise StorageError(f"Failed to connect to S3 storage: {e}")

            if res.status_code == 404:
                raise StorageNotFoundError(f"Object '{storage_key}' not found in S3 bucket '{self.bucket}'.")
            if res.status_code >= 400:
                raise StorageError(f"S3 verify HEAD request returned status {res.status_code}")

            actual_size = int(res.headers.get("content-length", "0"))
            content_type = res.headers.get("content-type", expected_content_type or "application/octet-stream")
            etag = res.headers.get("etag")

            if expected_size is not None and actual_size != expected_size:
                raise StorageError(
                    f"Size mismatch: expected {expected_size} bytes, got {actual_size} bytes."
                )

            return StoredObjectMetadata(
                storage_key=storage_key,
                size_bytes=actual_size,
                content_type=content_type,
                etag=etag,
            )

    async def create_download_url(
        self,
        storage_key: str,
        expires_in_seconds: int = 3600,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> str:
        return self._build_presigned_url(
            method="GET",
            storage_key=storage_key,
            expires_in_seconds=expires_in_seconds,
            public_base=True,
        )

    async def delete_object(self, storage_key: str) -> bool:
        url = self._build_presigned_url(
            method="DELETE",
            storage_key=storage_key,
            expires_in_seconds=60,
            public_base=False,
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.delete(url)
            return res.status_code in (200, 204, 404)

    async def read_object_bytes(
        self,
        storage_key: str,
        max_bytes: Optional[int] = None,
    ) -> bytes:
        url = self._build_presigned_url(
            method="GET",
            storage_key=storage_key,
            expires_in_seconds=60,
            public_base=False,
        )
        headers = {}
        if max_bytes is not None:
            headers["Range"] = f"bytes=0-{max_bytes - 1}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code in (200, 206):
                return res.content
            if res.status_code == 404:
                raise StorageNotFoundError(f"Object '{storage_key}' not found.")
            raise StorageError(f"Failed to read object bytes: HTTP {res.status_code}")
