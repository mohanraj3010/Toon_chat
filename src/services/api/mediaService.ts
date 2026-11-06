import { apiClient, API_BASE } from './httpClient';

export type SupportedMediaType = 'image' | 'voice' | 'video' | 'file';

export interface MediaInitiateRequest {
  media_type: SupportedMediaType;
  content_type: string;
  filename: string;
  size_bytes: number;
}

export interface MediaInitiateResponse {
  media_id: string;
  storage_key: string;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  expires_at: string;
  max_size_bytes: number;
}

export interface MediaConfirmResponse {
  id: string;
  uploader_id: string;
  storage_key: string;
  media_type: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  sha256_hash?: string;
  created_at: string;
  metadata_json?: {
    original_filename?: string;
  };
}

export interface MediaUrlResponse {
  media_id: string;
  download_url: string;
  expires_in_seconds: number;
  content_type: string;
}

export interface VoiceUploadMetadata {
  durationMs: number;
  mimeType: string;
  baseMimeType?: string;
  sizeBytes?: number;
}

export interface VoiceUploadResult {
  mediaId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
}

interface CachedDownloadUrl {
  downloadUrl: string;
  expiresAt: number;
  contentType: string;
}

// In-memory cache for short-lived download URLs with proactive expiry
const downloadUrlCache = new Map<string, CachedDownloadUrl>();

export const mediaService = {
  /**
   * Initiates media upload session with backend.
   * Returns short-lived authorized upload URL.
   */
  async initiateUpload(req: MediaInitiateRequest): Promise<MediaInitiateResponse> {
    return apiClient.post<MediaInitiateResponse>('/media/upload/initiate', req);
  },

  /**
   * Uploads raw binary bytes directly to the returned storage target.
   * Uses XMLHttpRequest for accurate upload progress and abort support.
   */
  async uploadBytes(
    target: MediaInitiateResponse,
    file: File | Blob,
    onProgress?: (progressPercent: number) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Resolve upload URL (relative to API base if not absolute)
      let resolvedUrl = target.upload_url;
      if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
        const cleanBase = API_BASE.replace(/\/api\/v1\/?$/, '');
        resolvedUrl = `${cleanBase}${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`;
      }

      const xhr = new XMLHttpRequest();
      xhr.open(target.method || 'PUT', resolvedUrl, true);

      // Apply target headers
      if (target.headers) {
        Object.entries(target.headers).forEach(([key, val]) => {
          xhr.setRequestHeader(key, val);
        });
      }

      // Track progress
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(Math.min(100, Math.max(0, pct)));
          }
        };
      }

      // Handle abort signal
      if (abortSignal) {
        if (abortSignal.aborted) {
          xhr.abort();
          return reject(new Error('Upload cancelled'));
        }
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
        } else {
          let errDetail = `Upload failed with status ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            errDetail = parsed.message || parsed.detail || errDetail;
          } catch {
            // keep default
          }
          reject(new Error(errDetail));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during file upload.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('File upload timed out.'));
      };

      xhr.send(file);
    });
  },

  /**
   * Confirms upload presence, size, and magic signature in backend storage.
   * Transitions status to 'ready'.
   */
  async confirmUpload(mediaId: string): Promise<MediaConfirmResponse> {
    return apiClient.post<MediaConfirmResponse>(`/media/${mediaId}/confirm`);
  },

  /**
   * Uploads a recorded voice note through the 3-step media pipeline:
   * 1. Initiate upload session (POST /media/upload/initiate)
   * 2. Upload raw audio binary bytes (PUT to upload_url)
   * 3. Confirm upload and verify audio signature (POST /media/{id}/confirm)
   */
  async uploadVoice(
    blob: Blob,
    meta: VoiceUploadMetadata,
    onProgress?: (progressPercent: number) => void,
    abortSignal?: AbortSignal
  ): Promise<VoiceUploadResult> {
    const rawMime = meta.mimeType || blob.type || 'audio/webm';
    const baseMime = (meta.baseMimeType || rawMime.split(';')[0]).trim().toLowerCase();

    // Determine canonical extension based on audio container/codec
    let ext = '.webm';
    if (baseMime.includes('ogg')) {
      ext = '.ogg';
    } else if (baseMime.includes('mp4') || baseMime.includes('m4a') || baseMime.includes('aac')) {
      ext = '.mp4';
    } else if (baseMime.includes('mpeg') || baseMime.includes('mp3')) {
      ext = '.mp3';
    } else if (baseMime.includes('wav')) {
      ext = '.wav';
    }

    const filename = `voice_${Date.now()}${ext}`;

    // Step 1: Initiate
    const initiateRes = await this.initiateUpload({
      media_type: 'voice',
      content_type: rawMime,
      filename,
      size_bytes: blob.size,
    });

    // Step 2: Upload raw audio bytes
    await this.uploadBytes(initiateRes, blob, onProgress, abortSignal);

    // Step 3: Confirm
    const confirmRes = await this.confirmUpload(initiateRes.media_id);

    return {
      mediaId: initiateRes.media_id,
      storageKey: confirmRes.storage_key,
      mimeType: confirmRes.mime_type,
      sizeBytes: confirmRes.size_bytes,
      durationMs: meta.durationMs,
    };
  },

  /**
   * Retrieves an authorized short-lived download URL.
   * Enforces conversation membership and caches in memory.
   */
  async getMediaUrl(mediaId: string, options?: { forceRefresh?: boolean }): Promise<MediaUrlResponse> {
    if (options?.forceRefresh) {
      downloadUrlCache.delete(mediaId);
    }

    const cached = downloadUrlCache.get(mediaId);
    const now = Date.now();
    // Cache valid if > 60 seconds before expiration
    if (!options?.forceRefresh && cached && cached.expiresAt > now + 60000) {
      return {
        media_id: mediaId,
        download_url: cached.downloadUrl,
        expires_in_seconds: Math.round((cached.expiresAt - now) / 1000),
        content_type: cached.contentType,
      };
    }

    const res = await apiClient.get<MediaUrlResponse>(`/media/${mediaId}/url`);

    // Resolve URL for relative endpoints
    let downloadUrl = res.download_url;
    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      const cleanBase = API_BASE.replace(/\/api\/v1\/?$/, '');
      downloadUrl = `${cleanBase}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
    }

    const expiresAt = now + res.expires_in_seconds * 1000;
    downloadUrlCache.set(mediaId, {
      downloadUrl,
      expiresAt,
      contentType: res.content_type,
    });

    return {
      ...res,
      download_url: downloadUrl,
    };
  },

  /**
   * Convenience helper to retrieve an authorized short-lived download URL string.
   */
  async getDownloadUrl(mediaId: string, options?: { forceRefresh?: boolean }): Promise<string> {
    const res = await this.getMediaUrl(mediaId, options);
    return res.download_url;
  },

  /**
   * Invalidates a cached download URL (e.g. upon download/playback error).
   */
  invalidateMediaUrl(mediaId: string): void {
    downloadUrlCache.delete(mediaId);
  },

  /**
   * Deletes media item from storage and marks deleted.
   */
  async deleteMedia(mediaId: string): Promise<void> {
    downloadUrlCache.delete(mediaId);
    await apiClient.delete(`/media/${mediaId}`);
  },

  /**
   * Clears in-memory URL cache (e.g. on logout or disconnect).
   */
  clearCache(): void {
    downloadUrlCache.clear();
  },
};

