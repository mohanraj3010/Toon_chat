import { useState, useEffect, useCallback, useRef } from 'react';
import { mediaService } from '@/services/api/mediaService';

export interface UseResolvedMediaUrlReturn {
  resolvedUrl: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refreshUrl: (force?: boolean) => Promise<string | null>;
}

/**
 * Validates whether a media URL is a playable/renderable direct asset URL
 * vs an API metadata resolution endpoint (e.g., `/api/v1/media/<id>/url`).
 */
export function isDirectMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return true;
  if (url.includes('/api/v1/media/') && url.endsWith('/url')) return false;
  if (url.includes('/storage/file/')) return true;
  if (url.includes('token=') || url.includes('signature=')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  return false;
}

/**
 * Hook to resolve and refresh authorized signed URLs for media attachments.
 * - Respects local blob: URLs immediately (no network call needed)
 * - Resolves missing URLs from mediaId via backend getMediaUrl
 * - Provides seamless refreshUrl() for expired or failing signed URLs
 */
export function useResolvedMediaUrl(
  mediaId?: string,
  initialUrl?: string | null
): UseResolvedMediaUrlReturn {
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  const isDirect = isDirectMediaUrl(initialUrl);

  // Derive resolved URL with preference for local blob: URLs or newly fetched URLs
  const resolvedUrl: string | null =
    initialUrl && initialUrl.startsWith('blob:')
      ? initialUrl
      : fetchedUrl || (isDirect && initialUrl ? initialUrl : null);

  const fetchUrl = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!mediaId) return null;

      if (initialUrl && initialUrl.startsWith('blob:') && !forceRefresh) {
        return initialUrl;
      }

      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        const res = await mediaService.getMediaUrl(mediaId, { forceRefresh });
        if (isMountedRef.current) {
          setFetchedUrl(res.download_url);
          setIsLoading(false);
        }
        return res.download_url;
      } catch (err) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Failed to resolve media URL';
          setIsError(true);
          setErrorMessage(msg);
          setIsLoading(false);
        }
        return null;
      }
    },
    [mediaId, initialUrl]
  );

  // Auto-resolve on mount if initialUrl is missing or incomplete
  useEffect(() => {
    isMountedRef.current = true;

    const hasDirectUrl = isDirectMediaUrl(initialUrl);

    if (!hasDirectUrl && mediaId) {
      // Schedule asynchronous fetch to avoid synchronous render phase setState
      const timer = setTimeout(() => {
        void fetchUrl(false);
      }, 0);
      return () => {
        clearTimeout(timer);
        isMountedRef.current = false;
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [mediaId, initialUrl, fetchUrl]);

  const refreshUrl = useCallback(
    async (force = true): Promise<string | null> => {
      return fetchUrl(force);
    },
    [fetchUrl]
  );

  return {
    resolvedUrl,
    isLoading,
    isError,
    errorMessage,
    refreshUrl,
  };
}
