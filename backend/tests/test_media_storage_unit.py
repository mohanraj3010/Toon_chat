import pytest
from app.core.errors import BadRequestError
from app.services.media_validator import (
    get_max_size_for_media_type,
    sanitize_filename,
    validate_magic_signature,
    validate_upload_initiation,
)
from app.services.storage.base import StorageError, StorageNotFoundError
from app.services.storage.local import LocalStorageService
from app.services.storage.memory import MemoryStorageService
from app.services.storage.s3 import S3StorageService


def test_validator_valid_image_initiation():
    ext = validate_upload_initiation(
        media_type="image",
        content_type="image/png",
        filename="photo.PNG",
        declared_size_bytes=1024 * 1024,
    )
    assert ext == ".png"


def test_validator_wrong_mime():
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation(
            media_type="image",
            content_type="application/x-executable",
            filename="virus.exe",
            declared_size_bytes=500,
        )
    assert "not permitted" in str(exc.value.message)


def test_validator_extension_mismatch():
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation(
            media_type="image",
            content_type="image/png",
            filename="photo.jpg",
            declared_size_bytes=500,
        )
    assert "does not match declared MIME" in str(exc.value.message)


def test_validator_oversized_upload():
    max_img = get_max_size_for_media_type("image")
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation(
            media_type="image",
            content_type="image/jpeg",
            filename="large.jpeg",
            declared_size_bytes=max_img + 1,
        )
    assert "exceeds maximum permitted limit" in str(exc.value.message)


def test_validator_magic_signatures():
    # PNG
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert validate_magic_signature("image/png", png_bytes) is True
    assert validate_magic_signature("image/jpeg", png_bytes) is False

    # JPEG
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    assert validate_magic_signature("image/jpeg", jpeg_bytes) is True
    assert validate_magic_signature("image/png", jpeg_bytes) is False

    # WebP
    webp_bytes = b"RIFF\x12\x00\x00\x00WEBPVP8 "
    assert validate_magic_signature("image/webp", webp_bytes) is True

    # Ogg
    ogg_bytes = b"OggS\x00\x02\x00\x00"
    assert validate_magic_signature("audio/ogg", ogg_bytes) is True

    # WebM
    webm_bytes = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81"
    assert validate_magic_signature("video/webm", webm_bytes) is True
    assert validate_magic_signature("audio/webm", webm_bytes) is True

    # MP4
    mp4_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00"
    assert validate_magic_signature("video/mp4", mp4_bytes) is True

    # Invalid / spoofed
    fake_png = b"NOT_A_REAL_PNG_HEADER"
    assert validate_magic_signature("image/png", fake_png) is False
    assert validate_magic_signature("image/jpeg", fake_png) is False


def test_validator_file_initiation():
    # PDF
    ext = validate_upload_initiation(
        media_type="file",
        content_type="application/pdf",
        filename="document.pdf",
        declared_size_bytes=5 * 1024 * 1024,
    )
    assert ext == ".pdf"

    # TXT
    ext = validate_upload_initiation(
        media_type="file",
        content_type="text/plain",
        filename="notes.txt",
        declared_size_bytes=1000,
    )
    assert ext == ".txt"

    # ZIP
    ext = validate_upload_initiation(
        media_type="file",
        content_type="application/zip",
        filename="archive.zip",
        declared_size_bytes=10 * 1024 * 1024,
    )
    assert ext == ".zip"

    # DOC
    ext = validate_upload_initiation(
        media_type="file",
        content_type="application/msword",
        filename="legacy.doc",
        declared_size_bytes=2000,
    )
    assert ext == ".doc"

    # DOCX
    ext = validate_upload_initiation(
        media_type="file",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="report.docx",
        declared_size_bytes=5000,
    )
    assert ext == ".docx"

    # Rejection of executable as file
    with pytest.raises(BadRequestError):
        validate_upload_initiation(
            media_type="file",
            content_type="application/x-executable",
            filename="virus.exe",
            declared_size_bytes=100,
        )

    # Rejection of HTML as file
    with pytest.raises(BadRequestError):
        validate_upload_initiation(
            media_type="file",
            content_type="text/html",
            filename="page.html",
            declared_size_bytes=100,
        )

    # Rejection of oversized file (> 25 MiB)
    with pytest.raises(BadRequestError) as exc:
        validate_upload_initiation(
            media_type="file",
            content_type="application/pdf",
            filename="giant.pdf",
            declared_size_bytes=26_214_401,
        )
    assert "exceeds maximum permitted limit" in str(exc.value.message)


def test_validator_file_magic_signatures():
    # PDF signature %PDF-
    pdf_bytes = b"%PDF-1.7\r\n%\xe2\xe3\xcf\xd3"
    assert validate_magic_signature("application/pdf", pdf_bytes) is True
    assert validate_magic_signature("application/zip", pdf_bytes) is False

    # ZIP signature PK\x03\x04
    zip_bytes = b"PK\x03\x04\x14\x00\x00\x00\x08\x00"
    assert validate_magic_signature("application/zip", zip_bytes) is True
    assert validate_magic_signature("application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip_bytes) is True
    assert validate_magic_signature("application/pdf", zip_bytes) is False

    # DOC legacy OLE CFBF signature
    doc_bytes = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1\x00\x00"
    assert validate_magic_signature("application/msword", doc_bytes) is True
    assert validate_magic_signature("application/pdf", doc_bytes) is False

    # text/plain
    txt_bytes = b"Hello world! This is a clean text file."
    assert validate_magic_signature("text/plain", txt_bytes) is True

    # text/plain with embedded NUL bytes (binary masquerading as text)
    bin_txt = b"Hello\x00world\x00evil"
    assert validate_magic_signature("text/plain", bin_txt) is False

    # text/plain masquerading HTML/SVG
    html_txt = b"<!DOCTYPE html><html><body><h1>XSS</h1></body></html>"
    assert validate_magic_signature("text/plain", html_txt) is False

    svg_txt = b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"
    assert validate_magic_signature("text/plain", svg_txt) is False


def test_sanitize_filename():
    # Path traversal
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\calc.exe") == "calc.exe"

    # CRLF injection and header manipulation
    assert "\r" not in sanitize_filename("malicious\r\nContent-Type: text/html\r\n.pdf")
    assert "\n" not in sanitize_filename("malicious\r\nContent-Type: text/html\r\n.pdf")

    # Double quotes / semicolon strip
    assert '"' not in sanitize_filename('my "special"; file.pdf')
    assert ';' not in sanitize_filename('my "special"; file.pdf')

    # Safe clean filename preserves standard characters
    assert sanitize_filename("Project Report (Final) 2026.pdf") == "Project Report (Final) 2026.pdf"

    # Empty fallback
    assert sanitize_filename("") == "file"
    assert sanitize_filename("   ") == "file"


@pytest.mark.asyncio
async def test_memory_storage_service():
    mem = MemoryStorageService()
    key = "media/image/user1/m1/sample.png"

    # Create upload target
    target = await mem.create_upload_target(key, "image/png", 5000)
    assert target.storage_key == key
    assert target.method == "PUT"

    # Verify non-existent
    with pytest.raises(StorageNotFoundError):
        await mem.verify_object(key)

    # Store object
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    mem.set_object(key, png_bytes, "image/png")

    # Verify object
    meta = await mem.verify_object(key, expected_content_type="image/png")
    assert meta.size_bytes == len(png_bytes)
    assert meta.content_type == "image/png"
    assert meta.sha256_hash is not None

    # Read bytes
    read_data = await mem.read_object_bytes(key, max_bytes=8)
    assert read_data == png_bytes[:8]

    # Download URL
    dl_url = await mem.create_download_url(key)
    assert "memory://download" in dl_url

    # Delete
    deleted = await mem.delete_object(key)
    assert deleted is True
    assert mem.has_object(key) is False


def test_local_storage_path_traversal_prevention(tmp_path):
    local = LocalStorageService(base_dir=str(tmp_path))

    # Path traversal attack
    with pytest.raises(StorageError) as exc:
        local._resolve_path("../../etc/passwd")
    assert "Path traversal detected" in str(exc.value.message)

    # Prefix collision attack (e.g. storage vs storage_evil)
    with pytest.raises(StorageError) as exc2:
        local._resolve_path("../" + tmp_path.name + "_evil/payload.png")
    assert "Path traversal detected" in str(exc2.value.message)


@pytest.mark.asyncio
async def test_s3_storage_presigned_url_generation():
    s3 = S3StorageService(
        endpoint_url="http://localhost:9000",
        public_endpoint_url="http://localhost:9000",
        bucket_name="toonchat-media",
        access_key="test_access",
        secret_key="test_secret",
        region="us-east-1",
    )
    key = "media/image/user123/img.png"
    target = await s3.create_upload_target(key, "image/png", 1024)
    assert "http://localhost:9000/toonchat-media/media/image/user123/img.png?" in target.upload_url
    assert "X-Amz-Signature=" in target.upload_url
    assert "X-Amz-Algorithm=AWS4-HMAC-SHA256" in target.upload_url

    dl = await s3.create_download_url(key)
    assert "http://localhost:9000/toonchat-media/media/image/user123/img.png?" in dl
    assert "X-Amz-Signature=" in dl
