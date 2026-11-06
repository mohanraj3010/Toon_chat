import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock in-memory localStorage for Node.js test environment
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

import { realProfileService, formatJoinedAt } from '../api/realProfileService';
import { apiClient } from '@/services/api/httpClient';
import { supabase } from '@/features/auth/api/supabaseClient';

vi.mock('@/services/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Profile Service & Dynamic User Binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
  });

  describe('formatJoinedAt', () => {
    it('formats ISO datetime into Month Year string', () => {
      const result = formatJoinedAt('2026-11-04T12:00:00Z');
      expect(result).toBe('November 2026');
    });

    it('handles undefined or invalid dates gracefully', () => {
      expect(formatJoinedAt(undefined)).toBe('Recently');
      expect(formatJoinedAt('invalid-date')).toBe('Recently');
    });
  });

  describe('getCurrentProfile', () => {
    it('fetches authenticated user bundle from /me and maps dynamic profile fields', async () => {
      const mockMeResponse = {
        authenticated: true,
        user: {
          id: 'user-uuid-1234',
          username: 'luna_star',
          email: 'luna@example.com',
          displayName: 'Luna Star',
          avatarUrl: 'https://cdn.toonchat.com/avatar1.png',
          status: 'online',
          vibeText: 'Starry skies & cozy tea ✨',
          isActive: true,
          isVerified: true,
          createdAt: '2026-11-04T10:00:00Z',
        },
        profile: {
          displayName: 'Luna Star',
          bio: 'Exploring Maple Park by starlight!',
          characterBase: 3,
          joinedAt: '2026-11-04T10:00:00Z',
          avatarUrl: 'https://cdn.toonchat.com/avatar1.png',
          status: 'online',
          vibeText: 'Starry skies & cozy tea ✨',
          favoriteReaction: '⭐',
          mood: 'Curious & Dreamy 🌙',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockMeResponse);

      const profile = await realProfileService.getCurrentProfile();

      expect(apiClient.get).toHaveBeenCalledWith('/me', { requiresAuth: true });
      expect(profile.id).toBe('user-uuid-1234');
      expect(profile.username).toBe('luna_star');
      expect(profile.displayName).toBe('Luna Star');
      expect(profile.bio).toBe('Exploring Maple Park by starlight!');
      expect(profile.vibeText).toBe('Starry skies & cozy tea ✨');
      expect(profile.characterBase).toBe(3);
      expect(profile.joinedAt).toBe('November 2026');
      expect(profile.status).toBe('online');
      expect(profile.relationship).toBe('self');
      expect(profile.displayName).not.toBe('Mohanraj K.');
      expect(profile.username).not.toBe('mohank');
    });

    it('falls back to active Supabase session when backend /me is unreachable', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const testUser = {
        id: 'user-uuid-session-5678',
        email: 'sparks@maplepark.com',
        user_metadata: {
          username: 'sparks_fly',
          displayName: 'Sparks Fly',
          characterBase: 4,
          vibeText: 'High energy! ⚡',
          bio: 'Skate park champion.',
        },
        app_metadata: {},
        created_at: '2026-10-15T08:30:00Z',
      };

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'tok-123',
            refresh_token: 'ref-123',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: 'bearer',
            user: testUser,
          },
        },
        error: null,
      });

      const profile = await realProfileService.getCurrentProfile();

      expect(profile.id).toBe('user-uuid-session-5678');
      expect(profile.username).toBe('sparks_fly');
      expect(profile.displayName).toBe('Sparks Fly');
      expect(profile.characterBase).toBe(4);
      expect(profile.vibeText).toBe('High energy! ⚡');
      expect(profile.bio).toBe('Skate park champion.');
      expect(profile.joinedAt).toBe('October 2026');
      expect(profile.relationship).toBe('self');
      expect(profile.displayName).not.toBe('Mohanraj K.');
    });
  });

  describe('getProfileByUsername', () => {
    it('returns current profile when username is "me" or matches logged in username', async () => {
      const mockMeResponse = {
        authenticated: true,
        user: {
          id: 'user-uuid-1234',
          username: 'luna_star',
          email: 'luna@example.com',
          displayName: 'Luna Star',
          status: 'online',
          isActive: true,
          isVerified: true,
          createdAt: '2026-11-04T10:00:00Z',
        },
        profile: {
          displayName: 'Luna Star',
          bio: 'Exploring Maple Park!',
          characterBase: 3,
          joinedAt: '2026-11-04T10:00:00Z',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockMeResponse);

      const profile = await realProfileService.getProfileByUsername('me');
      expect(profile?.username).toBe('luna_star');
      expect(profile?.displayName).toBe('Luna Star');
      expect(profile?.relationship).toBe('self');
    });

    it('queries backend /users/:username for other registered toons', async () => {
      const otherUserResponse = {
        authenticated: true,
        user: {
          id: 'other-uuid-8888',
          username: 'barnaby_bear',
          displayName: 'Barnaby Bear',
          status: 'away',
          isActive: true,
          isVerified: false,
          createdAt: '2026-09-01T12:00:00Z',
        },
        profile: {
          displayName: 'Barnaby Bear',
          bio: 'Honey pots and nap spots 🍯',
          characterBase: 5,
          joinedAt: '2026-09-01T12:00:00Z',
          vibeText: 'Chilling out',
        },
      };

      // First call for current profile check
      vi.mocked(apiClient.get)
        .mockResolvedValueOnce({
          authenticated: true,
          user: { id: 'me-1', username: 'my_user', displayName: 'My User', createdAt: '2026-11-01T00:00:00Z' },
          profile: { characterBase: 1, joinedAt: '2026-11-01T00:00:00Z' },
        })
        .mockResolvedValueOnce(otherUserResponse);

      const profile = await realProfileService.getProfileByUsername('barnaby_bear');
      expect(apiClient.get).toHaveBeenCalledWith('/users/barnaby_bear', { requiresAuth: true });
      expect(profile?.username).toBe('barnaby_bear');
      expect(profile?.displayName).toBe('Barnaby Bear');
      expect(profile?.characterBase).toBe(5);
      expect(profile?.relationship).toBe('none');
    });
  });

  describe('updateProfile', () => {
    it('persists profile edits via PATCH /me and returns updated profile', async () => {
      const updatedResponse = {
        authenticated: true,
        user: {
          id: 'user-uuid-1234',
          username: 'luna_star_updated',
          email: 'luna@example.com',
          displayName: 'Luna Super Star',
          status: 'dnd',
          vibeText: 'Busy crafting ✨',
          isActive: true,
          isVerified: true,
          createdAt: '2026-11-04T10:00:00Z',
        },
        profile: {
          displayName: 'Luna Super Star',
          bio: 'Updated bio in Maple Park',
          characterBase: 6,
          joinedAt: '2026-11-04T10:00:00Z',
          status: 'dnd',
          vibeText: 'Busy crafting ✨',
        },
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedResponse);

      const updated = await realProfileService.updateProfile({
        displayName: 'Luna Super Star',
        bio: 'Updated bio in Maple Park',
        characterBase: 6,
        status: 'dnd',
        vibeText: 'Busy crafting ✨',
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/me',
        {
          displayName: 'Luna Super Star',
          bio: 'Updated bio in Maple Park',
          characterBase: 6,
          status: 'dnd',
          vibeText: 'Busy crafting ✨',
        },
        { requiresAuth: true }
      );
      expect(updated.displayName).toBe('Luna Super Star');
      expect(updated.characterBase).toBe(6);
      expect(updated.status).toBe('dnd');
    });
  });
});
