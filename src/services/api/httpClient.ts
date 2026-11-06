import { supabase } from '@/features/auth/api/supabaseClient';
import { API_BASE_URL } from '@/app/env';

/**
 * Authoritative API Base URL.
 * Defaults to 'https://toonchat-backend.onrender.com/api/v1' in production/fallback.
 * Never falls back to a relative path like '/api/v1' in production to prevent 404s on static hosts (e.g. Vercel).
 */
export const API_BASE = API_BASE_URL;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Synchronous active token reference directly synced from AuthContext
let activeToken: string | null = null;
let activeTokenProvider: (() => string | null | Promise<string | null>) | null = null;

export function setActiveToken(token: string | null): void {
  activeToken = token;
}

export function setAuthTokenProvider(
  provider: (() => string | null | Promise<string | null>) | null
): void {
  activeTokenProvider = provider;
}

interface StoredSessionPayload {
  access_token?: string;
  accessToken?: string;
  token?: string;
  expires_at?: number;
  currentSession?: {
    access_token?: string;
  };
  user?: {
    id?: string;
    email?: string;
  };
}

/**
 * Robust multi-key token extractor that checks all known session storage keys:
 * 1. ToonChat emulator session: 'toonchat_supabase_auth_session_v1'
 * 2. Supabase JS SDK session keys: 'sb-<ref>-auth-token'
 * 3. Fallback generic auth keys: 'toonchat_token', 'access_token', 'auth_token', etc.
 * 4. Also checks sessionStorage
 */
export function extractTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const parseToken = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Direct token string (JWT format)
    if (trimmed.startsWith('eyJ') || (trimmed.split('.').length === 3 && !trimmed.startsWith('{'))) {
      return trimmed;
    }

    if (trimmed.startsWith('{')) {
      try {
        const parsed: StoredSessionPayload = JSON.parse(trimmed);
        const token =
          parsed.access_token ||
          parsed.accessToken ||
          parsed.currentSession?.access_token ||
          parsed.token;
        if (typeof token === 'string' && token.trim()) {
          return token.trim();
        }
      } catch {
        // ignore JSON parse error
      }
    }
    return null;
  };

  // 1. Primary emulator session key
  try {
    const emulatorToken = parseToken(localStorage.getItem('toonchat_supabase_auth_session_v1'));
    if (emulatorToken) return emulatorToken;
  } catch {
    // continue
  }

  // 2. Supabase SDK session keys (sb-<projectRef>-auth-token)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const sbToken = parseToken(localStorage.getItem(key));
        if (sbToken) return sbToken;
      }
    }
  } catch {
    // continue
  }

  // 3. Fallback generic auth keys
  const fallbackKeys = [
    'supabase.auth.token',
    'toonchat_token',
    'access_token',
    'auth_token',
    'token',
    'toonchat_auth_session',
    'toonchat_session',
    'auth_session',
  ];
  for (const k of fallbackKeys) {
    try {
      const token = parseToken(localStorage.getItem(k));
      if (token) return token;
    } catch {
      // continue
    }
  }

  // 4. SessionStorage fallback
  try {
    if (typeof sessionStorage !== 'undefined') {
      const sessToken = parseToken(sessionStorage.getItem('toonchat_supabase_auth_session_v1'));
      if (sessToken) return sessToken;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const sbToken = parseToken(sessionStorage.getItem(key));
          if (sbToken) return sbToken;
        }
      }
    }
  } catch {
    // continue
  }

  return null;
}

/**
 * Checks whether a JWT token has passed its expiration claim.
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);
    if (typeof payload.exp === 'number') {
      // Buffer of 10 seconds before actual expiration
      return payload.exp <= Math.floor(Date.now() / 1000) + 10;
    }
    return false;
  } catch {
    return false;
  }
}

async function getAccessToken(): Promise<string | null> {
  // 1. Explicit active token set from AuthContext
  if (activeToken) {
    if (!isTokenExpired(activeToken)) {
      return activeToken;
    }
  }

  // 2. Dynamic provider if registered
  if (activeTokenProvider) {
    try {
      const provided = await activeTokenProvider();
      if (provided && !isTokenExpired(provided)) {
        return provided;
      }
    } catch {
      // continue
    }
  }

  // 3. Supabase Auth getSession()
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      if (!isTokenExpired(data.session.access_token)) {
        return data.session.access_token;
      }
    }
  } catch {
    // continue
  }

  // 4. Fallback: inspect localStorage and sessionStorage
  const storedToken = extractTokenFromStorage();
  if (storedToken && !isTokenExpired(storedToken)) {
    return storedToken;
  }

  return null;
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session?.access_token) {
        throw error || new Error('Session refresh failed');
      }
      const token = data.session.access_token;
      activeToken = token;
      return token;
    } catch {
      // Check storage after refresh attempt
      const stored = extractTokenFromStorage();
      if (stored) {
        activeToken = stored;
        return stored;
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  token?: string;
}

export async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, token: explicitToken, ...restOptions } = options;
  const headers = new Headers(customHeaders);

  if (!headers.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token if required
  if (requiresAuth) {
    if (explicitToken) {
      // Use caller-provided token directly
      headers.set('Authorization', `Bearer ${explicitToken}`);
    } else if (!headers.has('Authorization')) {
      // Resolve from active state, Supabase session, or storage
      let token = await getAccessToken();
      if (!token) {
        token = await refreshAccessToken();
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        console.warn(
          `[httpClient] Protected request to '${endpoint}' initiated without session token. Checked Supabase session, active state, and storage.`
        );
      }
    }
  }

  // Construct URL
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api\/v1/, '');
  }
  const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${API_BASE}${cleanEndpoint}`;

  // Safe developer diagnostics (never logs sensitive token contents)
  if (import.meta.env.DEV) {
    const hasAuth = headers.has('Authorization');
    const authHeader = headers.get('Authorization') || '';
    const tokenLen = authHeader.startsWith('Bearer ') ? authHeader.slice(7).length : 0;
    console.debug(`[httpClient] ${options.method || 'GET'} ${cleanEndpoint} [Auth: ${hasAuth}, tokenLength: ${tokenLen}]`);
  }

  let response = await fetch(url, {
    ...restOptions,
    headers,
  });

  // Handle 401 Unauthorized with single refresh attempt and retry
  if (response.status === 401 && requiresAuth) {
    const isAuthEndpoint = endpoint === '/me' || endpoint.startsWith('/auth/');
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...restOptions,
        headers,
      });
    } else if (!isAuthEndpoint) {
      // Only signal session expiry on operational requests, never during auth/profile bootstrap
      window.dispatchEvent(new CustomEvent('toonchat:session-expired'));
    }
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (errJson.detail && typeof errJson.detail.message === 'string') {
        errorDetail = errJson.detail.message;
      } else if (typeof errJson.message === 'string') {
        errorDetail = errJson.message;
      } else {
        errorDetail = JSON.stringify(errJson);
      }
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    const error = new Error(errorDetail);
    (error as unknown as { status: number }).status = response.status;
    throw error;
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
