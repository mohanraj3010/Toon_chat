import os
import re
from typing import Dict, Set, Tuple
from app.core.config import settings
from app.core.constants import (
    ALLOWED_MIME_BY_MEDIA_TYPE,
    MIME_TO_EXTENSIONS,
    VOICE_EXTENSION_TO_MIME,
)
from app.core.errors import BadRequestError


def parse_and_normalize_mime_type(content_type: str) -> Tuple[str, Dict[str, str]]:
    """
    Parses and normalizes a MIME Content-Type string from browsers and HTTP clients.
    
    Features:
    1. Strips leading/trailing whitespace and filters ASCII control characters / CRLF.
    2. Extracts lowercase base MIME type (e.g. 'audio/webm;codecs=opus' -> 'audio/webm').
    3. Normalizes common container aliases (e.g. 'audio/x-wav' -> 'audio/wav').
    4. Safely parses optional key=value parameters (e.g. {'codecs': 'opus'}).
    5. Strips outer quotes and disallows control characters in parameter values.
    """
    if not content_type:
        return "", {}

    # Strip CRLF and all ASCII control characters (0x00 - 0x1F, 0x7F)
    cleaned = re.sub(r"[\r\n\x00-\x1f\x7f]", "", content_type.strip())
    if not cleaned:
        return "", {}

    parts = [p.strip() for p in cleaned.split(";") if p.strip()]
    if not parts:
        return "", {}

    base_mime = parts[0].lower().strip()

    # Normalization aliases for audio
    if base_mime in ("audio/x-wav", "audio/wave", "audio/vnd.wave"):
        base_mime = "audio/wav"

    params: Dict[str, str] = {}
    for part in parts[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            k = k.strip().lower()
            v = v.strip().strip('"\'').strip()
            # Sanitize parameter values: reject control characters or excessive lengths
            clean_k = re.sub(r"[^a-zA-Z0-9_\-]", "", k)[:32]
            clean_v = re.sub(r"[^\x20-\x7e]", "", v)[:128]
            if clean_k and clean_v:
                params[clean_k] = clean_v

    return base_mime, params


def sanitize_filename(filename: str) -> str:
    """
    Safely sanitizes a client-provided filename for display and response headers.
    Prevents CRLF injection, header splitting, path traversal, and control character attacks.
    """
    if not filename:
        return "file"

    # 1. Normalize path separators and extract basename only (prevent directory traversal)
    clean = filename.replace("\\", "/").strip()
    clean = os.path.basename(clean)

    # 2. Strip CRLF and all ASCII control characters (0x00 - 0x1F, 0x7F)
    clean = re.sub(r"[\r\n\x00-\x1f\x7f]", "", clean)

    # 3. Strip quotes and backslashes to protect HTTP Content-Disposition headers
    clean = clean.replace('"', "").replace("'", "").replace(";", "")

    # 4. Collapse multiple spaces
    clean = re.sub(r"\s+", " ", clean).strip()

    # 5. Limit length to 255 chars
    if len(clean) > 255:
        name_part, ext_part = os.path.splitext(clean)
        allowed_name_len = max(1, 255 - len(ext_part))
        clean = name_part[:allowed_name_len] + ext_part

    return clean or "file"


def get_max_size_for_media_type(media_type: str) -> int:
    clean_type = media_type.strip().lower()
    if clean_type == "image":
        return settings.MAX_IMAGE_SIZE_BYTES
    elif clean_type == "voice":
        return settings.MAX_VOICE_SIZE_BYTES
    elif clean_type == "video":
        return settings.MAX_VIDEO_SIZE_BYTES
    elif clean_type == "file":
        return settings.MAX_FILE_SIZE_BYTES
    raise BadRequestError(f"Unsupported media type: '{media_type}'")


def validate_upload_initiation(
    media_type: str,
    content_type: str,
    filename: str,
    declared_size_bytes: int,
) -> str:
    """
    Validates media upload initiation parameters.
    Handles parameterized browser MIME types safely without weakening security.
    Returns the canonical file extension.
    """
    clean_media_type = media_type.strip().lower()
    if clean_media_type not in ALLOWED_MIME_BY_MEDIA_TYPE:
        raise BadRequestError(
            f"Invalid media type '{media_type}'. Must be one of: {list(ALLOWED_MIME_BY_MEDIA_TYPE.keys())}",
            details={"error_subcode": "INVALID_MEDIA_TYPE"},
        )

    base_mime, _ = parse_and_normalize_mime_type(content_type)
    allowed_mimes = ALLOWED_MIME_BY_MEDIA_TYPE[clean_media_type]
    if not base_mime or base_mime not in allowed_mimes:
        raise BadRequestError(
            f"MIME type '{content_type}' is not permitted for media type '{media_type}'.",
            details={"error_subcode": "UNSUPPORTED_MIME_TYPE", "allowed": list(allowed_mimes)},
        )

    _, ext = os.path.splitext(filename.strip().lower())
    if not ext:
        raise BadRequestError(
            "Filename must include a valid file extension.",
            details={"error_subcode": "MISSING_EXTENSION"},
        )

    allowed_exts = MIME_TO_EXTENSIONS.get(base_mime, set())
    if ext not in allowed_exts:
        raise BadRequestError(
            f"File extension '{ext}' does not match declared MIME type '{content_type}'.",
            details={"error_subcode": "EXTENSION_MIME_MISMATCH", "expected_extensions": list(allowed_exts)},
        )

    max_size = get_max_size_for_media_type(clean_media_type)
    if declared_size_bytes <= 0:
        raise BadRequestError(
            "File size must be greater than 0 bytes.",
            details={"error_subcode": "INVALID_FILE_SIZE"},
        )
    if declared_size_bytes > max_size:
        raise BadRequestError(
            f"File size exceeds maximum permitted limit for {clean_media_type} ({max_size} bytes).",
            details={"error_subcode": "FILE_TOO_LARGE", "max_size": max_size},
        )

    return ext


def validate_magic_signature(content_type: str, header_bytes: bytes) -> bool:
    """
    Validates file content magic signature bytes to prevent extension/MIME spoofing.
    Normalizes parameterized MIME strings before checking signatures.
    Never trusts client Content-Type headers alone.
    """
    if not header_bytes:
        return False

    base_mime, _ = parse_and_normalize_mime_type(content_type)

    if base_mime == "image/jpeg":
        return header_bytes.startswith(b"\xff\xd8\xff")

    elif base_mime == "image/png":
        return header_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    elif base_mime == "image/webp":
        return len(header_bytes) >= 12 and header_bytes.startswith(b"RIFF") and header_bytes[8:12] == b"WEBP"

    elif base_mime == "audio/ogg":
        # Ogg container synchronization pattern (OggS)
        return header_bytes.startswith(b"OggS")

    elif base_mime in ("audio/webm", "video/webm"):
        # Matroska / EBML container signature (1A 45 DF A3)
        return header_bytes.startswith(b"\x1a\x45\xdf\xa3")

    elif base_mime == "audio/wav":
        # RIFF WAVE format header (52 49 46 46 .... 57 41 56 45)
        return len(header_bytes) >= 12 and header_bytes.startswith(b"RIFF") and header_bytes[8:12] == b"WAVE"

    elif base_mime in ("video/mp4", "audio/mp4"):
        # 1. ISO Base Media File Format box begins with 'ftyp' at offset 4
        if len(header_bytes) >= 8 and header_bytes[4:8] == b"ftyp":
            return True
        # 2. AAC ADTS frame syncword (12 bits 0xFFF)
        if len(header_bytes) >= 2 and header_bytes[0] == 0xFF and (header_bytes[1] & 0xF6) == 0xF0:
            return True
        return False

    elif base_mime == "audio/mpeg":
        if header_bytes.startswith(b"ID3"):
            return True
        # Frame sync: 11 bits set (0xFF followed by 0xE0 or higher)
        if len(header_bytes) >= 2 and header_bytes[0] == 0xFF and (header_bytes[1] & 0xE0) == 0xE0:
            return True
        return False

    elif base_mime == "application/pdf":
        # PDF document header: %PDF-
        return header_bytes.startswith(b"%PDF-")

    elif base_mime in (
        "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        # ZIP archive header / DOCX OpenXML package container (PK\x03\x04, PK\x05\x06, PK\x07\x08)
        return (
            header_bytes.startswith(b"PK\x03\x04")
            or header_bytes.startswith(b"PK\x05\x06")
            or header_bytes.startswith(b"PK\x07\x08")
        )

    elif base_mime == "application/msword":
        # Microsoft Compound File Binary Format (CFBF/OLE) magic header
        return header_bytes.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")

    elif base_mime == "text/plain":
        # Plain text files must not contain NUL bytes and must decode safely
        if b"\x00" in header_bytes:
            return False
        # Disallow HTML/SVG masquerading as plain text
        lower_sample = header_bytes[:64].lower()
        if (
            b"<html" in lower_sample
            or b"<!doctype html" in lower_sample
            or b"<svg" in lower_sample
            or b"<script" in lower_sample
        ):
            return False
        try:
            header_bytes.decode("utf-8")
            return True
        except UnicodeDecodeError:
            try:
                header_bytes.decode("latin-1")
                return True
            except UnicodeDecodeError:
                return False

    return False
