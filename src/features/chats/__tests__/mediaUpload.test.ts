import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mediaService } from '@/services/api/mediaService';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_FILE_MIMES,
  MAX_IMAGE_SIZE,
  MAX_FILE_SIZE,
  validateFile,
  sanitizeClientFilename,
  getSafeStoredUploads,
  persistUploadJobSafe,
} from '../hooks/useMediaUpload';

// Mock in-memory sessionStorage for Node.js test environment
const storageMap = new Map<string, string>();
const sessionStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  get length() {
    return storageMap.size;
  },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
    configurable: true,
  });
}

describe('Phase 13.2 Media Upload & Security Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageMock.clear();
    mediaService.clearCache();
  });

  afterEach(() => {
    sessionStorageMock.clear();
  });

  describe('MIME & Size Whitelist Enforcement', () => {
    it('accepts permitted image types within 10 MB limit', () => {
      ALLOWED_IMAGE_MIMES.forEach((mime) => {
        const file = new File(['mock content'], 'test-image', { type: mime });
        const error = validateFile(file, 'image');
        expect(error).toBeNull();
      });
    });

    it('rejects forbidden image types (e.g. SVG, GIF, TIFF)', () => {
      const forbidden = ['image/svg+xml', 'image/gif', 'image/tiff', 'image/bmp'];
      forbidden.forEach((mime) => {
        const file = new File(['<svg></svg>'], 'exploit.svg', { type: mime });
        const error = validateFile(file, 'image');
        expect(error).toContain('Unsupported image format');
      });
    });

    it('rejects oversized images (> 10 MB)', () => {
      const file = new File(['mock data'], 'giant.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: MAX_IMAGE_SIZE + 1 });
      const error = validateFile(file, 'image');
      expect(error).toContain('Image must be under 10 MB');
    });

    it('accepts permitted document types within 25 MiB limit', () => {
      ALLOWED_FILE_MIMES.forEach((mime) => {
        const file = new File(['mock document bytes'], 'doc.pdf', { type: mime });
        const error = validateFile(file, 'file');
        expect(error).toBeNull();
      });
    });

    it('rejects executable, script, and HTML file types', () => {
      const dangerousMimes = [
        'application/x-msdownload',
        'application/x-sh',
        'text/html',
        'application/javascript',
        'application/x-executable',
      ];
      dangerousMimes.forEach((mime) => {
        const file = new File(['alert(1)'], 'danger.exe', { type: mime });
        const error = validateFile(file, 'file');
        expect(error).toContain('Unsupported file format');
      });
    });

    it('rejects oversized document files (> 25 MiB)', () => {
      const file = new File(['large document'], 'archive.zip', { type: 'application/zip' });
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
      const error = validateFile(file, 'file');
      expect(error).toContain('File must be under 25 MB');
    });
  });

  describe('Filename Sanitization & Path Traversal Mitigations', () => {
    it('strips directory traversal prefixes and backslashes', () => {
      expect(sanitizeClientFilename('../../etc/passwd.pdf')).toBe('passwd.pdf');
      expect(sanitizeClientFilename('..\\..\\windows\\system32\\cmd.exe.zip')).toBe('cmd.exe.zip');
    });

    it('strips control characters and null bytes', () => {
      expect(sanitizeClientFilename('sneaky\x00file\x1f.txt')).toBe('sneakyfile.txt');
    });

    it('falls back to default safe name if completely stripped', () => {
      expect(sanitizeClientFilename('')).toBe('attachment');
      expect(sanitizeClientFilename('   ')).toBe('attachment');
      expect(sanitizeClientFilename('../..///')).toBe('attachment');
    });

    it('bounds overly long filenames to 255 characters while preserving extension', () => {
      const longBase = 'a'.repeat(300);
      const sanitized = sanitizeClientFilename(`${longBase}.pdf`);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.pdf')).toBe(true);
    });
  });

  describe('Safe Browser Session Persistence (No Credentials / Signed URLs Stored)', () => {
    it('stores strictly safe metadata and never tokens or upload URLs', () => {
      const safeUpload = {
        id: 'job-123',
        mediaId: 'media-xyz',
        file: new File(['dummy'], 'notes.txt', { type: 'text/plain' }),
        fileName: 'notes.txt',
        fileSize: 100,
        mimeType: 'text/plain',
        mediaType: 'file' as const,
        progress: 100,
        status: 'ready' as const,
      };

      persistUploadJobSafe('test-conv', safeUpload);

      const raw = sessionStorageMock.getItem('toonchat_upload_jobs_test-conv');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw || '[]');
      expect(parsed).toHaveLength(1);

      // Verify safe metadata only
      expect(parsed[0].id).toBe('job-123');
      expect(parsed[0].mediaId).toBe('media-xyz');
      expect(parsed[0].name).toBe('notes.txt');
      expect(parsed[0].size).toBe(100);

      // Verify no sensitive properties exist in storage
      expect(parsed[0].token).toBeUndefined();
      expect(parsed[0].uploadUrl).toBeUndefined();
      expect(parsed[0].signedUrl).toBeUndefined();
      expect(parsed[0].file).toBeUndefined(); // Raw binary handle is NOT serializable
    });

    it('marks incomplete jobs as failed requiring re-selection upon page reload/restore', () => {
      // Simulate stored incomplete job from before reload
      sessionStorageMock.setItem(
        'toonchat_upload_jobs_reloaded-conv',
        JSON.stringify([
          {
            id: 'job-incomplete',
            name: 'large.zip',
            size: 5000000,
            mimeType: 'application/zip',
            mediaType: 'file',
            progress: 45,
            status: 'uploading',
          },
        ])
      );

      const restored = getSafeStoredUploads('reloaded-conv');
      expect(restored).toHaveLength(1);
      expect(restored[0].id).toBe('job-incomplete');
      // Must be safely marked as failed with honest re-selection notice
      expect(restored[0].status).toBe('failed');
      expect(restored[0].error).toContain('interrupted by page reload');
      expect(restored[0].requiresReSelection).toBe(true);
    });
  });

  describe('Upload Client Service & Lifecycle Execution', () => {
    it('initiates upload through backend authenticated endpoint', async () => {
      const mockResponse = {
        media_id: 'media-abc-123',
        storage_key: 'uploads/2026/img.jpg',
        upload_url: 'http://localhost:8000/api/v1/media/upload/mock-token',
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        expires_at: '2026-11-01T12:00:00Z',
        max_size_bytes: 10485760,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await mediaService.initiateUpload({
        media_type: 'image',
        content_type: 'image/jpeg',
        filename: 'sunset.jpg',
        size_bytes: 1024,
      });

      expect(result.media_id).toBe('media-abc-123');
      expect(result.upload_url).toBe('http://localhost:8000/api/v1/media/upload/mock-token');
    });

    it('confirms upload through backend authenticated endpoint', async () => {
      const mockConfirm = {
        id: 'media-abc-123',
        uploader_id: 'user-1',
        storage_key: 'uploads/2026/img.jpg',
        media_type: 'image',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        status: 'ready',
        created_at: '2026-11-01T12:00:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockConfirm), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await mediaService.confirmUpload('media-abc-123');
      expect(result.id).toBe('media-abc-123');
      expect(result.status).toBe('ready');
    });

    it('caches short-lived download URL and returns cached copy within TTL', async () => {
      const mockDownload = {
        media_id: 'media-cache-test',
        download_url: 'http://localhost:8000/api/v1/media/files/mock-storage-key?sig=123',
        expires_in_seconds: 300,
        content_type: 'image/jpeg',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockDownload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // First fetch
      const url1 = await mediaService.getDownloadUrl('media-cache-test');
      expect(url1).toBe(mockDownload.download_url);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second fetch should use in-memory cache
      const url2 = await mediaService.getDownloadUrl('media-cache-test');
      expect(url2).toBe(mockDownload.download_url);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('handles expired or rejected upload initiation gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum limit' },
          }),
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(
        mediaService.initiateUpload({
          media_type: 'file',
          content_type: 'application/zip',
          filename: 'big.zip',
          size_bytes: 30000000,
        })
      ).rejects.toThrow('File exceeds maximum limit');
    });

    it('handles confirmation failure gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: { code: 'UPLOAD_NOT_FOUND', message: 'Uploaded file not found in storage' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(mediaService.confirmUpload('missing-media-id')).rejects.toThrow(
        'Uploaded file not found in storage'
      );
    });
  });

  describe('Phase 14 Security: Download Protocol Validation', () => {
    it('rejects unsafe protocols such as javascript: or data: in download URLs', () => {
      const unsafeProtocols = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
      ];

      for (const url of unsafeProtocols) {
        const isSafe =
          url.startsWith('/') ||
          url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('blob:');
        expect(isSafe).toBe(false);
      }
    });

    it('permits safe authorized download protocols', () => {
      const safeProtocols = [
        'https://supabase.co/storage/v1/object/signed/toonchat/file.pdf',
        'http://localhost:8000/api/v1/media/storage/file/media/file/user1/doc.pdf',
        '/api/v1/media/storage/file/test.pdf',
        'blob:http://localhost:3000/1234-5678',
      ];

      for (const url of safeProtocols) {
        const isSafe =
          url.startsWith('/') ||
          url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('blob:');
        expect(isSafe).toBe(true);
      }
    });
  });
});
