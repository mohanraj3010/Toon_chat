import { describe, it, expect, vi, beforeEach } from 'vitest';

const storageMap = new Map<string, string>();
const localStorageMock = {
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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

const sessionMap = new Map<string, string>();
const sessionStorageMock = {
  getItem: (key: string) => sessionMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    sessionMap.delete(key);
  },
  clear: () => {
    sessionMap.clear();
  },
  get length() {
    return sessionMap.size;
  },
  key: (index: number) => Array.from(sessionMap.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

const eventListeners = new Map<string, Set<(e: unknown) => void>>();
const windowMock = {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  addEventListener: (event: string, handler: (e: unknown) => void) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(handler);
  },
  removeEventListener: (event: string, handler: (e: unknown) => void) => {
    eventListeners.get(event)?.delete(handler);
  },
  dispatchEvent: (event: { type: string }) => {
    const handlers = eventListeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    return true;
  },
};

if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: windowMock,
    writable: true,
    configurable: true,
  });
}

import { supabase } from '@/features/auth/api/supabaseClient';
import { conversationService } from '@/features/chats/api/conversationService';

describe('Phase 12 Auth 401 Regression Suite', () => {
  beforeEach(() => {
    storageMap.clear();
    sessionMap.clear();
    eventListeners.clear();
    vi.restoreAllMocks();
  });

  it('1. Expired session refresh produces a fresh token in emulator', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredSession = {
      access_token: 'old_expired_access_token',
      refresh_token: 'valid_refresh_token_123',
      expires_at: now - 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        email: 'toon@maplepark.com',
        user_metadata: { username: 'luna_toon', displayName: 'Luna Toon' },
        app_metadata: { provider: 'email' },
        created_at: new Date().toISOString(),
      },
    };
    storageMap.set('toonchat_supabase_auth_session_v1', JSON.stringify(expiredSession));

    const { data, error } = await supabase.auth.refreshSession();
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    expect(data.session?.access_token).not.toBe('old_expired_access_token');
    expect(data.session?.expires_at).toBeGreaterThan(now);
  });

  it('2. Protected request with expired token automatically refreshes and attaches fresh Bearer token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredSession = {
      access_token: 'old_expired_access_token',
      refresh_token: 'valid_refresh_token_123',
      expires_at: now - 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        email: 'toon@maplepark.com',
        user_metadata: { username: 'luna_toon', displayName: 'Luna Toon' },
        app_metadata: { provider: 'email' },
        created_at: new Date().toISOString(),
      },
    };
    storageMap.set('toonchat_supabase_auth_session_v1', JSON.stringify(expiredSession));

    let sentAuthHeader: string | null = null;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const headers = init?.headers instanceof Headers 
        ? init.headers 
        : new Headers(init?.headers as Record<string, string>);
      sentAuthHeader = headers.get('Authorization');

      if (!sentAuthHeader || sentAuthHeader.includes('old_expired_access_token')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Valid authentication credentials were not provided.' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [],
      };
    }) as unknown as typeof fetch;

    const convs = await conversationService.getConversations();
    expect(convs).toEqual([]);
    expect(sentAuthHeader).toBeTruthy();
    expect(sentAuthHeader).not.toContain('old_expired_access_token');
  });

  it('3. Logged-in user search and conversation list succeed with HTTP 200', async () => {
    // Seed valid session
    await supabase.auth.signInWithPassword({
      email: 'toon@maplepark.com',
      password: 'password123',
    });

    const requestsCaptured: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const headers = init?.headers instanceof Headers 
        ? init.headers 
        : new Headers(init?.headers as Record<string, string>);
      const auth = headers.get('Authorization');
      requestsCaptured.push(`${init?.method || 'GET'} ${url} [Auth: ${Boolean(auth)}]`);

      return {
        ok: true,
        status: 200,
        json: async () => [],
      };
    }) as unknown as typeof fetch;

    const users = await conversationService.searchUsers('luna');
    const convs = await conversationService.getConversations();

    expect(users).toEqual([]);
    expect(convs).toEqual([]);
    expect(requestsCaptured.length).toBe(2);
    expect(requestsCaptured[0]).toContain('[Auth: true]');
    expect(requestsCaptured[1]).toContain('[Auth: true]');
  });

  it('4. User A to User B account switch never sends User A token', async () => {
    // Login as User A
    await supabase.auth.signInWithPassword({
      email: 'toon@maplepark.com',
      password: 'password123',
    });
    const sessionA = (await supabase.auth.getSession()).data.session;
    expect(sessionA).not.toBeNull();
    const tokenA = sessionA!.access_token;

    // Logout
    await supabase.auth.signOut();
    expect((await supabase.auth.getSession()).data.session).toBeNull();

    // Register User B
    const userBEmail = 'user_b@maplepark.com';
    await supabase.auth.signUp({
      email: userBEmail,
      password: 'password456',
      options: { data: { username: 'user_b', displayName: 'User B' } },
    });
    const sessionB = (await supabase.auth.getSession()).data.session;
    expect(sessionB).not.toBeNull();
    const tokenB = sessionB!.access_token;

    expect(tokenA).not.toBe(tokenB);

    // Verify request uses token B
    let capturedHeader = '';
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers instanceof Headers 
        ? init.headers 
        : new Headers(init?.headers as Record<string, string>);
      capturedHeader = headers.get('Authorization') || '';
      return { ok: true, status: 200, json: async () => [] };
    }) as unknown as typeof fetch;

    await conversationService.getConversations();
    expect(capturedHeader).toBe(`Bearer ${tokenB}`);
    expect(capturedHeader).not.toBe(`Bearer ${tokenA}`);
  });

  it('5. Unauthenticated call without token receives 401 and signals session expiration', async () => {
    expect((await supabase.auth.getSession()).data.session).toBeNull();

    let expiredDispatched = false;
    const listener = () => {
      expiredDispatched = true;
    };
    window.addEventListener('toonchat:session-expired', listener);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Valid authentication credentials were not provided.' }),
      };
    }) as unknown as typeof fetch;

    await expect(conversationService.getConversations()).rejects.toThrow(
      'Valid authentication credentials were not provided.'
    );
    expect(expiredDispatched).toBe(true);

    window.removeEventListener('toonchat:session-expired', listener);
  });
});
