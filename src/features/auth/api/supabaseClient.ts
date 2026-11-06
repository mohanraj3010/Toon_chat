import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const LOCAL_STORAGE_SESSION_KEY = 'toonchat_supabase_auth_session_v1';
const LOCAL_STORAGE_USERS_KEY = 'toonchat_supabase_auth_users_v1';

export interface LocalSessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
    created_at: string;
  };
}

/**
 * Local Supabase Auth emulator client.
 * Emulates the exact Supabase Auth SDK surface for local development (DB_TARGET=local)
 * and offline browser verification without requiring cloud credentials.
 */
class LocalSupabaseAuthClient {
  private listeners: Array<(event: string, session: LocalSessionData | null) => void> = [];

  private createToken(userId: string, email: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(
      JSON.stringify({
        sub: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email,
        exp: now + 3600, // 1 hour expiration
        iat: now,
      })
    );
    const signature = btoa(`sig_${userId.slice(0, 8)}_${now}`);
    return `${header}.${payload}.${signature}`;
  }
  private getStoredSession(): LocalSessionData | null {
    try {
      let raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (!raw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
            raw = localStorage.getItem(k);
            break;
          }
        }
      }
      if (!raw) return null;
      const parsed: LocalSessionData = JSON.parse(raw);
      // If token expired, simulate expired state
      if (parsed.expires_at && parsed.expires_at < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveSession(session: LocalSessionData | null): void {
    if (session) {
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
  }

  private getRegisteredUsers(): Record<string, { id: string; email: string; passwordHash: string; metadata: Record<string, unknown> }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch {
      // return default seed user
    }
    return {
      'toon@maplepark.com': {
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        email: 'toon@maplepark.com',
        passwordHash: btoa('password123'),
        metadata: {
          username: 'luna_toon',
          displayName: 'Luna Toon',
          characterBase: 1,
        },
      },
    };
  }

  private saveRegisteredUsers(users: Record<string, { id: string; email: string; passwordHash: string; metadata: Record<string, unknown> }>): void {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  }

  private notify(event: string, session: LocalSessionData | null): void {
    for (const listener of this.listeners) {
      try {
        listener(event, session);
      } catch (err) {
        console.error('Auth state listener error:', err);
      }
    }
  }

  async getSession(): Promise<{ data: { session: LocalSessionData | null }; error: null }> {
    let session = this.getStoredSession();
    if (!session) {
      try {
        let raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (!raw) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
              raw = localStorage.getItem(k);
              break;
            }
          }
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.refresh_token || parsed.access_token) && parsed.user) {
            const refreshRes = await this.refreshSession();
            if (refreshRes.data.session) {
              return { data: { session: refreshRes.data.session }, error: null };
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return { data: { session }, error: null };
  }

  onAuthStateChange(
    callback: (event: string, session: LocalSessionData | null) => void
  ): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.push(callback);
    // Initial emit
    const current = this.getStoredSession();
    callback(current ? 'INITIAL_SESSION' : 'SIGNED_OUT', current);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
          },
        },
      },
    };
  }

  async signUp({
    email,
    password,
    options,
  }: {
    email: string;
    password?: string;
    options?: { data?: Record<string, unknown> };
  }): Promise<{ data: { user: LocalSessionData['user'] | null; session: LocalSessionData | null }; error: Error | null }> {
    const users = this.getRegisteredUsers();
    const normalizedEmail = email.toLowerCase().trim();

    if (users[normalizedEmail]) {
      return {
        data: { user: null, session: null },
        error: new Error('User already registered in ToonChat!'),
      };
    }

    const userId = crypto.randomUUID();
    users[normalizedEmail] = {
      id: userId,
      email: normalizedEmail,
      passwordHash: password ? btoa(password) : '',
      metadata: options?.data || {},
    };
    this.saveRegisteredUsers(users);

    const now = Math.floor(Date.now() / 1000);
    const session: LocalSessionData = {
      access_token: this.createToken(userId, normalizedEmail),
      refresh_token: `refresh_${crypto.randomUUID()}`,
      expires_at: now + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        email: normalizedEmail,
        user_metadata: options?.data || {},
        app_metadata: { provider: 'email' },
        created_at: new Date().toISOString(),
      },
    };

    this.saveSession(session);
    this.notify('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password?: string;
  }): Promise<{ data: { user: LocalSessionData['user'] | null; session: LocalSessionData | null }; error: Error | null }> {
    const users = this.getRegisteredUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const record = users[normalizedEmail];

    if (!record || (password && record.passwordHash !== btoa(password))) {
      return {
        data: { user: null, session: null },
        error: new Error('Invalid email or password.'),
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const session: LocalSessionData = {
      access_token: this.createToken(record.id, normalizedEmail),
      refresh_token: `refresh_${crypto.randomUUID()}`,
      expires_at: now + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: record.id,
        email: normalizedEmail,
        user_metadata: record.metadata,
        app_metadata: { provider: 'email' },
        created_at: new Date().toISOString(),
      },
    };

    this.saveSession(session);
    this.notify('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  }

  async signOut(): Promise<{ error: null }> {
    this.saveSession(null);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async refreshSession(): Promise<{ data: { session: LocalSessionData | null }; error: Error | null }> {
    let current = this.getStoredSession();
    if (!current) {
      try {
        let raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (!raw) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
              raw = localStorage.getItem(k);
              break;
            }
          }
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.user && (parsed.refresh_token || parsed.access_token)) {
            current = parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    if (!current) {
      return { data: { session: null }, error: new Error('No active session to refresh') };
    }
    const now = Math.floor(Date.now() / 1000);
    const refreshed: LocalSessionData = {
      ...current,
      access_token: this.createToken(current.user.id, current.user.email),
      refresh_token: `refresh_${crypto.randomUUID()}`,
      expires_at: now + 3600,
    };
    this.saveSession(refreshed);
    this.notify('TOKEN_REFRESHED', refreshed);
    return { data: { session: refreshed }, error: null };
  }

  async updateUser(attributes: { password?: string; data?: Record<string, unknown> }): Promise<{ error: Error | null }> {
    const session = this.getStoredSession();
    if (!session) return { error: new Error('Not authenticated') };

    const users = this.getRegisteredUsers();
    const record = users[session.user.email];
    if (record) {
      if (attributes.password) {
        record.passwordHash = btoa(attributes.password);
      }
      if (attributes.data) {
        record.metadata = { ...record.metadata, ...attributes.data };
        session.user.user_metadata = record.metadata;
        this.saveSession(session);
      }
      this.saveRegisteredUsers(users);
    }
    return { error: null };
  }

  updateStoredSessionUser(userData: {
    id?: string;
    username?: string;
    displayName?: string;
    characterBase?: number;
    status?: string;
    vibeText?: string;
    avatarUrl?: string;
  }): void {
    const session = this.getStoredSession();
    if (!session) return;
    if (userData.id) session.user.id = userData.id;
    session.user.user_metadata = {
      ...session.user.user_metadata,
      ...userData,
    };
    this.saveSession(session);
    const users = this.getRegisteredUsers();
    if (users[session.user.email]) {
      if (userData.id) users[session.user.email].id = userData.id;
      users[session.user.email].metadata = {
        ...users[session.user.email].metadata,
        ...userData,
      };
      this.saveRegisteredUsers(users);
    }
  }
}

// Instantiate either real Supabase client or local emulator
const isRealSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('placeholder') &&
    !SUPABASE_URL.includes('nuvccdwimkebdnmsabnd')
);

export const supabase: SupabaseClient | { auth: LocalSupabaseAuthClient } = isRealSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : { auth: new LocalSupabaseAuthClient() };

export const isUsingLocalAuthEmulator = !isRealSupabaseConfigured;

export function updateSessionUserMetadata(data: {
  id?: string;
  username?: string;
  displayName?: string;
  characterBase?: number;
  status?: string;
  vibeText?: string;
  avatarUrl?: string;
}): void {
  if (
    'updateStoredSessionUser' in supabase.auth &&
    typeof (supabase.auth as unknown as { updateStoredSessionUser?: unknown }).updateStoredSessionUser === 'function'
  ) {
    (supabase.auth as unknown as { updateStoredSessionUser: (d: typeof data) => void }).updateStoredSessionUser(data);
  }
}
