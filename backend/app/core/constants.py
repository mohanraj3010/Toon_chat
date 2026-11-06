"""
Centralized core constants for ToonChat backend media validation and processing.
Provides canonical MIME types, container extension mappings, and audio normalization mappings.
"""
from typing import Dict, Set

# Allowed MIME types partitioned by media category
ALLOWED_MIME_BY_MEDIA_TYPE: Dict[str, Set[str]] = {
    "image": {
        "image/jpeg",
        "image/png",
        "image/webp",
    },
    "voice": {
        "audio/ogg",
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
    },
    "video": {
        "video/mp4",
        "video/webm",
    },
    "file": {
        "application/pdf",
        "text/plain",
        "application/zip",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
}

# Permitted file extensions for each base canonical MIME type
MIME_TO_EXTENSIONS: Dict[str, Set[str]] = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
    "audio/ogg": {".ogg", ".oga", ".opus"},
    "audio/webm": {".webm", ".weba"},
    "audio/mp4": {".m4a", ".mp4", ".aac"},
    "audio/mpeg": {".mp3"},
    "audio/wav": {".wav"},
    "video/mp4": {".mp4"},
    "video/webm": {".webm"},
    "application/pdf": {".pdf"},
    "text/plain": {".txt"},
    "application/zip": {".zip"},
    "application/msword": {".doc"},
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
}

# Voice container extensions to canonical audio MIME types
VOICE_EXTENSION_TO_MIME: Dict[str, str] = {
    ".webm": "audio/webm",
    ".weba": "audio/webm",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".opus": "audio/ogg",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".aac": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
}

