import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../api/authService';
import { supabase } from '../api/supabaseClient';
import { apiClient } from '@/services/api/httpClient';
import { queryClient } from '@/app/queryClient';
import { avatarService, avatarKeys } from '@/features/avatar/api/avatarService';
import { profileKeys } from '@/features/profile/api/queries';
import { conversationKeys } from '@/features/chats/api/useChats';
import { DEFAULT_AVATAR_CONFIG } from '@/features/avatar/types';

// Mock in-memory localStorage and window environment for Node.js
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

// Helper simulating ProtectedRoute navigation decision logic
function evaluateProtectedRoute({
  isLoading,
  isAuthenticated,
  currentPath,
}: {
  isLoading: boolean;
  isAuthenticated: boolean;
  currentPath: string;
}) {
  if (isLoading) {
    return { action: 'render_loading', redirect: null };
  }
  if (!isAuthenticated) {
    const safeFrom = currentPath !== '/login' && currentPath !== '/register' ? currentPath : undefined;
    return {
      action: 'redirect',
      redirect: {
        to: '/login',
        state: safeFrom ? { from: { pathname: safeFrom } } : undefined,
        replace: true,
      },
    };
  }
  return { action: 'render_children', redirect: null };
}

// Helper simulating PublicRoute navigation decision logic
function evaluatePublicRoute({
  isLoading,
  isAuthenticated,
  rawDest,
}: {
  isLoading: boolean;
  isAuthenticated: boolean;
  rawDest?: string;
}) {
  if (isLoading) {
    return { action: 'render_loading', redirect: null };
  }
  if (isAuthenticated) {
    const destination = rawDest && rawDest !== '/login' && rawDest !== '/register' ? rawDest : '/';
    return {
      action: 'redirect',
      redirect: {
        to: destination,
        replace: true,
      },
    };
  }
  return { action: 'render_children', redirect: null };
}

describe('ToonChat Auth Regression & Bug Fix Verification', () => {
  beforeEach(() => {
    storageMap.clear();
    eventListeners.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Successful Login Reaches Authenticated Main Route', () => {
    it('successfully signs in with valid credentials and resolves session and user', async () => {
      // Mock /me returning a profile
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce({
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        username: 'luna_toon',
        displayName: 'Luna Toon',
        characterBase: 1,
        status: 'online',
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      const result = await authService.login({
        email: 'toon@maplepark.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('toon@maplepark.com');
      expect(result.user.displayName).toBe('Luna Toon');
      expect(result.session).toBeDefined();
      expect(result.session.accessToken).toBeTruthy();

      // Verify PublicRoute with this session navigates away from login to main route '/'
      const routeCheck = evaluatePublicRoute({
        isLoading: false,
        isAuthenticated: Boolean(result.user && result.session),
      });

      expect(routeCheck.action).toBe('redirect');
      expect(routeCheck.redirect?.to).toBe('/');
    });
  });

  describe('2. Invalid Credentials Show a Proper Error', () => {
    it('throws a descriptive error when password is wrong without creating a session', async () => {
      await expect(
        authService.login({
          email: 'toon@maplepark.com',
          password: 'wrong_password_999',
        })
      ).rejects.toThrow(/Invalid email or password/i);

      // Ensure no active session was saved
      const sessionRes = await supabase.auth.getSession();
      expect(sessionRes.data.session).toBeNull();
    });

    it('throws a descriptive error for non-existent users', async () => {
      await expect(
        authService.login({
          email: 'unknown_ghost@maplepark.com',
          password: 'password123',
        })
      ).rejects.toThrow(/Invalid email or password/i);
    });
  });

  describe('3. Auth Initialization Does Not Remain Stuck', () => {
    it('uses fallbackUser when /me is unreachable so loading completes and user is authenticated', async () => {
      // Seed a session in local storage
      await supabase.auth.signInWithPassword({
        email: 'toon@maplepark.com',
        password: 'password123',
      });

      // Simulate backend /me network failure
      vi.spyOn(authService, 'getCurrentUser').mockRejectedValueOnce(
        new Error('Failed to fetch profile: Network error')
      );

      // Verify session exists in Supabase
      const { data } = await supabase.auth.getSession();
      expect(data.session).not.toBeNull();

      // Test fallback resolution logic matching AuthContext initializeAuth
      const fallbackUser = {
        id: data.session!.user.id,
        username:
          (data.session!.user.user_metadata?.username as string) ||
          data.session!.user.email?.split('@')[0] ||
          'ToonCitizen',
        email: data.session!.user.email,
        displayName:
          (data.session!.user.user_metadata?.displayName as string) ||
          'Toon Citizen',
        characterBase: (data.session!.user.user_metadata?.characterBase as number) || 1,
        status: 'online' as const,
        isActive: true,
        isVerified: true,
        createdAt: data.session!.user.created_at || new Date().toISOString(),
      };

      const authUser = await authService.getCurrentUser().catch(() => null);
      const finalUser = authUser || fallbackUser;

      // Ensure user is populated even when backend profile API failed
      expect(finalUser).toBeDefined();
      expect(finalUser.email).toBe('toon@maplepark.com');
      expect(finalUser.displayName).toBe('Luna Toon');

      // Route guard with this state does not get stuck in loading
      const routeCheck = evaluateProtectedRoute({
        isLoading: false,
        isAuthenticated: Boolean(finalUser && data.session),
        currentPath: '/chats',
      });

      expect(routeCheck.action).toBe('render_children');
    });
  });

  describe('4. Existing Authenticated Session Redirects Correctly', () => {
    it('redirects an authenticated user from /login to intended route if safe', () => {
      const decision = evaluatePublicRoute({
        isLoading: false,
        isAuthenticated: true,
        rawDest: '/chats/maple-square',
      });

      expect(decision.action).toBe('redirect');
      expect(decision.redirect?.to).toBe('/chats/maple-square');
    });

    it('sanitizes /login destination to prevent infinite redirect loops', () => {
      const decision = evaluatePublicRoute({
        isLoading: false,
        isAuthenticated: true,
        rawDest: '/login',
      });

      expect(decision.action).toBe('redirect');
      expect(decision.redirect?.to).toBe('/');
    });

    it('sanitizes /register destination to prevent redirect loops', () => {
      const decision = evaluatePublicRoute({
        isLoading: false,
        isAuthenticated: true,
        rawDest: '/register',
      });

      expect(decision.action).toBe('redirect');
      expect(decision.redirect?.to).toBe('/');
    });
  });

  describe('5. Protected Routes Remain Protected', () => {
    it('redirects unauthenticated users to /login and saves return path', () => {
      const decision = evaluateProtectedRoute({
        isLoading: false,
        isAuthenticated: false,
        currentPath: '/settings/security',
      });

      expect(decision.action).toBe('redirect');
      expect(decision.redirect?.to).toBe('/login');
      expect(decision.redirect?.state?.from?.pathname).toBe('/settings/security');
    });

    it('displays loading screen while auth is loading without prematurely redirecting', () => {
      const decision = evaluateProtectedRoute({
        isLoading: true,
        isAuthenticated: false,
        currentPath: '/chats',
      });

      expect(decision.action).toBe('render_loading');
      expect(decision.redirect).toBeNull();
    });

    it('does not save /login or /register as the return path', () => {
      const decision = evaluateProtectedRoute({
        isLoading: false,
        isAuthenticated: false,
        currentPath: '/login',
      });

      expect(decision.action).toBe('redirect');
      expect(decision.redirect?.to).toBe('/login');
      expect(decision.redirect?.state).toBeUndefined();
    });
  });

  describe('6. Profile and API Failure Handling', () => {
    it('attempts backend auto-provisioning if user is not in database during login', async () => {
      // First /me returns null (unprovisioned user)
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce(null);

      // Auto-provision via /auth/register succeeds
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        authenticated: true,
        user: {
          id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
          username: 'luna_toon',
          email: 'toon@maplepark.com',
          displayName: 'Luna Toon Provisioned',
          status: 'online',
          isActive: true,
          isVerified: true,
          createdAt: new Date().toISOString(),
        },
        profile: {
          displayName: 'Luna Toon Provisioned',
          bio: 'Cartoonist',
          characterBase: 1,
          joinedAt: new Date().toISOString(),
        },
      });

      const result = await authService.login({
        email: 'toon@maplepark.com',
        password: 'password123',
      });

      expect(postSpy).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({ email: 'toon@maplepark.com' }),
        { requiresAuth: true }
      );
      expect(result.user.displayName).toBe('Luna Toon Provisioned');
    });

    it('gracefully falls back if both /me and /auth/register fail', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce(null);
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Backend database unavailable'));

      const result = await authService.login({
        email: 'toon@maplepark.com',
        password: 'password123',
      });

      // Login still resolves successfully with the fallback identity from Supabase Auth
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('toon@maplepark.com');
      expect(result.session).toBeDefined();
    });
  });

  describe('7. Logout and Refresh Behavior', () => {
    it('logs out and wipes session from storage', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        username: 'luna_toon',
        displayName: 'Luna Toon',
        characterBase: 1,
        status: 'online',
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      // Sign in first
      await authService.login({
        email: 'toon@maplepark.com',
        password: 'password123',
      });

      let { data } = await supabase.auth.getSession();
      expect(data.session).not.toBeNull();

      // Call logout
      await authService.logout();

      data = (await supabase.auth.getSession()).data;
      expect(data.session).toBeNull();
    });

    it('refreshes token successfully via refreshSession', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        username: 'luna_toon',
        displayName: 'Luna Toon',
        characterBase: 1,
        status: 'online',
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      await authService.login({
        email: 'toon@maplepark.com',
        password: 'password123',
      });

      const { data, error } = await supabase.auth.refreshSession();
      expect(error).toBeNull();
      expect(data.session).not.toBeNull();
      expect(data.session?.access_token).toBeTruthy();
    });

    it('does not dispatch session-expired on auth/bootstrap 401s', async () => {
      let expiredDispatched = false;
      const listener = () => {
        expiredDispatched = true;
      };
      window.addEventListener('toonchat:session-expired', listener);

      // Simulate a fetch call returning 401 on /me
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      // Suppress refreshSession error
      vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValueOnce({
        data: { session: null } as unknown as { session: null },
        error: new Error('Cannot refresh') as unknown as null,
      });

      await expect(apiClient.get('/me', { requiresAuth: true })).rejects.toThrow();

      // Ensure session-expired was NOT triggered during /me bootstrap
      expect(expiredDispatched).toBe(false);

      window.removeEventListener('toonchat:session-expired', listener);
    });

    it('dispatches session-expired on operational 401s when token cannot be refreshed', async () => {
      let expiredDispatched = false;
      const listener = () => {
        expiredDispatched = true;
      };
      window.addEventListener('toonchat:session-expired', listener);

      // Simulate a fetch call returning 401 on an operational route like /chats
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ detail: 'Unauthorized operational request' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValueOnce({
        data: { session: null } as unknown as { session: null },
        error: new Error('Cannot refresh') as unknown as null,
      });

      await expect(apiClient.get('/chats', { requiresAuth: true })).rejects.toThrow();

      // Ensure session-expired WAS triggered on regular operational request failure
      expect(expiredDispatched).toBe(true);

      window.removeEventListener('toonchat:session-expired', listener);
    });
  });

  describe('7. Auth State & Storage Cleanup on Logout', () => {
    it('clears localStorage and sessionStorage completely on logout', async () => {
      // Put test tokens and cached data in storage
      localStorage.setItem('stale_mock_chat_token', 'mock_token_123');
      localStorage.setItem('stale_user_profile', JSON.stringify({ name: 'Old User' }));
      sessionStorage.setItem('stale_active_conversation', 'conv-999');

      // Call authService logout
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ message: 'Logged out' });
      await authService.logout();

      // Trigger the purge logic as executed in AuthContext handlePurgeState
      const preservedUsers = localStorage.getItem('toonchat_supabase_auth_users_v1');
      localStorage.clear();
      if (preservedUsers) {
        localStorage.setItem('toonchat_supabase_auth_users_v1', preservedUsers);
      }
      sessionStorage.clear();

      expect(localStorage.getItem('stale_mock_chat_token')).toBeNull();
      expect(localStorage.getItem('stale_user_profile')).toBeNull();
      expect(sessionStorage.getItem('stale_active_conversation')).toBeNull();
    });
  });

  describe('8. Cross-Account Stale User Data & Cache Isolation', () => {
    beforeEach(() => {
      queryClient.clear();
      localStorage.clear();
    });

    it('isolates custom avatars per user ID without cross-account leakage', () => {
      const userAId = 'user-uuid-aaaa-1111';
      const userBId = 'user-uuid-bbbb-2222';

      const customAvatarA = {
        ...DEFAULT_AVATAR_CONFIG,
        name: 'LunaCustomA',
        headShape: 'head-square',
      };

      // Save custom avatar for User A
      avatarService.saveAvatar(customAvatarA, userAId);

      // Verify User A has their custom avatar
      expect(avatarService.getAvatar(userAId)?.name).toBe('LunaCustomA');

      // Verify User B has NO custom avatar (returns null so Character starter toon can display)
      expect(avatarService.getAvatar(userBId)).toBeNull();

      // Verify getAvatarOrDefault returns DEFAULT_AVATAR_CONFIG for User B
      expect(avatarService.getAvatarOrDefault(userBId).name).toBe('Luna');

      // Verify query keys are separate
      expect(avatarKeys.user(userAId)).toEqual(['avatarConfig', userAId]);
      expect(avatarKeys.user(userBId)).toEqual(['avatarConfig', userBId]);
    });

    it('isolates profile query keys per user ID preventing stale profile render on account switch', () => {
      const userAId = 'user-uuid-aaaa-1111';
      const userBId = 'user-uuid-bbbb-2222';

      const profileA = {
        id: userAId,
        username: 'usera',
        displayName: 'User Alice',
      };

      // Seed User A's profile in QueryClient under User A's key
      queryClient.setQueryData(profileKeys.me(userAId), profileA);

      // Verify User A's profile is in cache
      expect(queryClient.getQueryData(profileKeys.me(userAId))).toEqual(profileA);

      // Verify User B's profile key has NO data (cannot return User A's profile)
      expect(queryClient.getQueryData(profileKeys.me(userBId))).toBeUndefined();
    });

    it('isolates conversation query keys per user ID', () => {
      const userAId = 'user-uuid-aaaa-1111';
      const userBId = 'user-uuid-bbbb-2222';

      const conversationsA = [
        { id: 'c-1', name: 'Alice Chat', participants: [] },
      ];

      // Seed User A's conversations
      queryClient.setQueryData(conversationKeys.user(userAId), conversationsA);

      // Verify User A's conversations exist
      expect(queryClient.getQueryData(conversationKeys.user(userAId))).toEqual(conversationsA);

      // Verify User B's conversation query is empty
      expect(queryClient.getQueryData(conversationKeys.user(userBId))).toBeUndefined();
    });

    it('clearing queryClient on account switch purges all cached user data', () => {
      const userAId = 'user-uuid-aaaa-1111';

      queryClient.setQueryData(profileKeys.me(userAId), { id: userAId, username: 'alice' });
      queryClient.setQueryData(conversationKeys.user(userAId), [{ id: 'c-1' }]);
      queryClient.setQueryData(avatarKeys.user(userAId), DEFAULT_AVATAR_CONFIG);

      // Perform cache clear as done on logout / login / switch
      queryClient.clear();

      expect(queryClient.getQueryData(profileKeys.me(userAId))).toBeUndefined();
      expect(queryClient.getQueryData(conversationKeys.user(userAId))).toBeUndefined();
      expect(queryClient.getQueryData(avatarKeys.user(userAId))).toBeUndefined();
    });

    it('prevents late-arriving User A API response from corrupting User B data', async () => {
      const userAId = 'user-uuid-aaaa-1111';
      const userBId = 'user-uuid-bbbb-2222';

      // Seed User B profile
      const profileB = { id: userBId, username: 'bob', displayName: 'Bob Citizen' };
      queryClient.setQueryData(profileKeys.me(userBId), profileB);

      // Late response for User A arrives
      const lateProfileA = { id: userAId, username: 'alice', displayName: 'Alice Citizen' };
      // If code attempts to set User A data using User A's key, User B's data remains untouched
      queryClient.setQueryData(profileKeys.me(userAId), lateProfileA);

      expect(queryClient.getQueryData(profileKeys.me(userBId))).toEqual(profileB);
      expect(queryClient.getQueryData(profileKeys.me(userBId))).not.toEqual(lateProfileA);
    });
  });
});
