import { useState, useCallback, useRef, useEffect } from 'react';
import { mediaService } from '@/services/api/mediaService';

export interface UploadItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  mimeType: string;
  mediaType: 'image' | 'file';
  status: 'queued' | 'uploading' | 'confirming' | 'ready' | 'failed' | 'cancelled';
  progress: number;
  mediaId?: string;
  downloadUrl?: string;
  previewUrl?: string;
  error?: string;
  abortController?: AbortController;
  requiresReSelection?: boolean;
}

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const ALLOWED_FILE_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_SIZE = 26_214_400; // 25 MiB

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function sanitizeClientFilename(name: string): string {
  if (!name) return 'attachment';
  // Strip path traversal and quotes/control chars
  const base = name.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'attachment';
  let clean = '';
  for (let i = 0; i < base.length; i++) {
    const code = base.charCodeAt(i);
    // Keep printable ASCII (>= 32 and != 127) and non-ASCII unicode
    if ((code >= 32 && code !== 127) || code > 127) {
      const ch = base[i];
      if (ch !== '"' && ch !== "'" && ch !== ';') {
        clean += ch;
      }
    }
  }
  clean = clean.trim();
  if (!clean || clean === '.' || clean === '..') return 'attachment';
  if (clean.length > 255) {
    const lastDot = clean.lastIndexOf('.');
    if (lastDot > 0 && clean.length - lastDot <= 10) {
      const ext = clean.slice(lastDot);
      clean = clean.slice(0, 255 - ext.length) + ext;
    } else {
      clean = clean.slice(0, 255);
    }
  }
  return clean;
}

export function validateFile(
  file: File,
  mediaType: 'image' | 'file',
  resolvedMime?: string
): string | null {
  const mime = (resolvedMime || file.type || '').toLowerCase();
  if (mediaType === 'image') {
    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      return 'Unsupported image format. Allowed: PNG, JPEG, WebP.';
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return 'Image must be under 10 MB.';
    }
  } else if (mediaType === 'file') {
    if (!ALLOWED_FILE_MIMES.has(mime)) {
      return 'Unsupported file format. Allowed: PDF, TXT, ZIP, DOC, DOCX.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be under 25 MB.';
    }
  }
  return null;
}

const STORAGE_KEY_PREFIX = 'toonchat_upload_jobs_';

function getInitialUploads(conversationId?: string): UploadItem[] {
  if (!conversationId || typeof window === 'undefined') return [];
  const sessionKey = `${STORAGE_KEY_PREFIX}${conversationId}`;
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<{
      id: string;
      name?: string;
      fileName?: string;
      size?: number;
      fileSize?: number;
      mimeType: string;
      mediaType: 'image' | 'file';
      status: string;
      mediaId?: string;
    }>;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => {
        const itemName = item.fileName || item.name || 'attachment';
        const itemSize = item.fileSize !== undefined ? item.fileSize : (item.size || 0);
        if (item.status === 'ready' && item.mediaId) {
          return {
            id: item.id,
            name: itemName,
            size: itemSize,
            mimeType: item.mimeType,
            mediaType: item.mediaType,
            status: 'ready' as const,
            progress: 100,
            mediaId: item.mediaId,
          };
        }
        return {
          id: item.id,
          name: itemName,
          size: itemSize,
          mimeType: item.mimeType,
          mediaType: item.mediaType,
          status: 'failed' as const,
          progress: 0,
          error: 'Upload was interrupted by page reload. Please re-select the file.',
          requiresReSelection: true,
        };
      });
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function getSafeStoredUploads(conversationId?: string): UploadItem[] {
  return getInitialUploads(conversationId);
}

export function persistUploadJobSafe(
  conversationId: string,
  item:
    | UploadItem
    | {
        id: string;
        mediaId?: string;
        name?: string;
        fileName?: string;
        size?: number;
        fileSize?: number;
        mimeType: string;
        mediaType: 'image' | 'file';
        status: string;
      }
): void {
  const sessionKey = `${STORAGE_KEY_PREFIX}${conversationId}`;
  const safeData = [
    {
      id: item.id,
      name:
        'fileName' in item && item.fileName
          ? item.fileName
          : 'name' in item
          ? item.name
          : 'attachment',
      size:
        'fileSize' in item && item.fileSize !== undefined
          ? item.fileSize
          : 'size' in item
          ? item.size
          : 0,
      mimeType: item.mimeType,
      mediaType: item.mediaType,
      status: item.status,
      mediaId: item.mediaId,
    },
  ];
  sessionStorage.setItem(sessionKey, JSON.stringify(safeData));
}

export function useMediaUpload(conversationId?: string) {
  const [uploads, setUploads] = useState<UploadItem[]>(() => getInitialUploads(conversationId));
  const previewUrlsRef = useRef<Set<string>>(new Set());

  // Sync safe metadata to sessionStorage (never storing tokens or URLs)
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;
    const sessionKey = `${STORAGE_KEY_PREFIX}${conversationId}`;
    if (uploads.length === 0) {
      sessionStorage.removeItem(sessionKey);
      return;
    }
    const safeData = uploads.map((u) => ({
      id: u.id,
      name: u.name,
      size: u.size,
      mimeType: u.mimeType,
      mediaType: u.mediaType,
      status: u.status,
      mediaId: u.mediaId,
    }));
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(safeData));
    } catch {
      // Handle quota exceeded gracefully
    }
  }, [uploads, conversationId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const urlsToClean = previewUrlsRef.current;
    return () => {
      urlsToClean.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urlsToClean.clear();
    };
  }, []);

  const createSafePreviewUrl = useCallback((file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      try {
        const url = URL.createObjectURL(file);
        previewUrlsRef.current.add(url);
        return url;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, []);

  const revokePreviewUrl = useCallback((url?: string) => {
    if (url && previewUrlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      previewUrlsRef.current.delete(url);
    }
  }, []);

  const startUploadForItem = useCallback(
    async (item: UploadItem) => {
      if (!item.file) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, status: 'failed', error: 'File binary is no longer in memory. Please re-select.' }
              : u
          )
        );
        return;
      }

      const abortController = new AbortController();
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: 'uploading', progress: 5, error: undefined, abortController }
            : u
        )
      );

      try {
        // Step 1: Initiate upload with backend
        const target = await mediaService.initiateUpload({
          media_type: item.mediaType,
          content_type: item.mimeType,
          filename: item.name,
          size_bytes: item.size,
        });

        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        // Step 2: Upload bytes directly to upload target with progress tracking
        await mediaService.uploadBytes(
          target,
          item.file,
          (pct) => {
            setUploads((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, progress: Math.max(10, pct) } : u))
            );
          },
          abortController.signal
        );

        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        // Step 3: Backend confirmation (storage presence & magic signature verification)
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'confirming', progress: 95 } : u))
        );

        const confirmRes = await mediaService.confirmUpload(target.media_id);

        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  status: 'ready',
                  progress: 100,
                  mediaId: confirmRes.id,
                  abortController: undefined,
                }
              : u
          )
        );
      } catch (err: unknown) {
        const isAbort = (err as Error)?.message === 'Upload cancelled' || abortController.signal.aborted;
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  status: isAbort ? 'cancelled' : 'failed',
                  error: isAbort ? 'Upload cancelled' : (err as Error)?.message || 'Upload failed',
                  abortController: undefined,
                }
              : u
          )
        );
      }
    },
    []
  );

  const addFiles = useCallback(
    (files: FileList | File[], preferredType?: 'image' | 'file') => {
      const fileArray = Array.from(files);
      const newItems: UploadItem[] = [];

      for (const file of fileArray) {
        const cleanName = sanitizeClientFilename(file.name);
        const mimeType = (file.type || '').toLowerCase();
        let mediaType: 'image' | 'file' = preferredType || (mimeType.startsWith('image/') ? 'image' : 'file');

        // Extension fallback if mimeType is empty or generic
        const ext = cleanName.slice(cleanName.lastIndexOf('.')).toLowerCase();
        let resolvedMime = mimeType;
        if (!resolvedMime || resolvedMime === 'application/octet-stream') {
          if (['.jpg', '.jpeg'].includes(ext)) resolvedMime = 'image/jpeg';
          else if (ext === '.png') resolvedMime = 'image/png';
          else if (ext === '.webp') resolvedMime = 'image/webp';
          else if (ext === '.pdf') resolvedMime = 'application/pdf';
          else if (ext === '.txt') resolvedMime = 'text/plain';
          else if (ext === '.zip') resolvedMime = 'application/zip';
          else if (ext === '.doc') resolvedMime = 'application/msword';
          else if (ext === '.docx') resolvedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        if (ALLOWED_IMAGE_MIMES.has(resolvedMime)) {
          mediaType = 'image';
        } else if (ALLOWED_FILE_MIMES.has(resolvedMime)) {
          mediaType = 'file';
        }

        const id = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const previewUrl = mediaType === 'image' ? createSafePreviewUrl(file) : undefined;

        // Validation: MIME allowlist check
        if (mediaType === 'image' && !ALLOWED_IMAGE_MIMES.has(resolvedMime)) {
          newItems.push({
            id,
            file,
            name: cleanName,
            size: file.size,
            mimeType: resolvedMime || 'unknown',
            mediaType: 'image',
            status: 'failed',
            progress: 0,
            previewUrl,
            error: 'Unsupported image format. Allowed: PNG, JPEG, WebP.',
          });
          continue;
        }

        if (mediaType === 'file' && !ALLOWED_FILE_MIMES.has(resolvedMime)) {
          newItems.push({
            id,
            file,
            name: cleanName,
            size: file.size,
            mimeType: resolvedMime || 'unknown',
            mediaType: 'file',
            status: 'failed',
            progress: 0,
            previewUrl,
            error: 'Unsupported file type. Permitted: PDF, TXT, ZIP, DOC, DOCX.',
          });
          continue;
        }

        // Validation: Size limits
        const maxLimit = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
        if (file.size <= 0) {
          newItems.push({
            id,
            file,
            name: cleanName,
            size: file.size,
            mimeType: resolvedMime,
            mediaType,
            status: 'failed',
            progress: 0,
            previewUrl,
            error: 'File is empty (0 bytes).',
          });
          continue;
        }

        if (file.size > maxLimit) {
          newItems.push({
            id,
            file,
            name: cleanName,
            size: file.size,
            mimeType: resolvedMime,
            mediaType,
            status: 'failed',
            progress: 0,
            previewUrl,
            error: `File exceeds size limit of ${formatBytes(maxLimit)}.`,
          });
          continue;
        }

        const validItem: UploadItem = {
          id,
          file,
          name: cleanName,
          size: file.size,
          mimeType: resolvedMime,
          mediaType,
          status: 'queued',
          progress: 0,
          previewUrl,
        };
        newItems.push(validItem);
      }

      setUploads((prev) => [...prev, ...newItems]);

      // Automatically launch uploads for valid queued items
      newItems.forEach((item) => {
        if (item.status === 'queued') {
          startUploadForItem(item);
        }
      });
    },
    [createSafePreviewUrl, startUploadForItem]
  );

  const cancelUpload = useCallback((id: string) => {
    setUploads((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          if (u.abortController) {
            u.abortController.abort();
          }
          return { ...u, status: 'cancelled', error: 'Upload cancelled', abortController: undefined };
        }
        return u;
      })
    );
  }, []);

  const retryUpload = useCallback(
    (id: string) => {
      const item = uploads.find((u) => u.id === id);
      if (item && item.file) {
        startUploadForItem(item);
      }
    },
    [uploads, startUploadForItem]
  );

  const removeUpload = useCallback(
    (id: string) => {
      setUploads((prev) => {
        const target = prev.find((u) => u.id === id);
        if (target) {
          if (target.abortController) {
            target.abortController.abort();
          }
          revokePreviewUrl(target.previewUrl);
        }
        return prev.filter((u) => u.id !== id);
      });
    },
    [revokePreviewUrl]
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      prev.forEach((u) => {
        if (u.status === 'ready') {
          revokePreviewUrl(u.previewUrl);
        }
      });
      return prev.filter((u) => u.status !== 'ready');
    });
  }, [revokePreviewUrl]);

  const isUploadingAny = uploads.some((u) => u.status === 'uploading' || u.status === 'confirming');
  const readyUploads = uploads.filter((u) => u.status === 'ready' && Boolean(u.mediaId));

  return {
    uploads,
    isUploadingAny,
    readyUploads,
    addFiles,
    cancelUpload,
    retryUpload,
    removeUpload,
    clearCompleted,
  };
}
