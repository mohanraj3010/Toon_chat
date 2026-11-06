import { describe, it, expect, beforeEach, vi } from 'vitest';
import { realFriendsService } from '../api/realFriendsService';
import { apiClient } from '@/services/api/httpClient';
import { conversationService } from '@/features/chats/api/conversationService';
import { NotificationsService } from '@/features/notifications/api/notificationsService';

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

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('RealFriendsService Integration Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('queries real friends from backend GET /friends when authenticated', async () => {
    const mockFriends = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'kai_skater',
        display_name: 'Kai',
        status: 'online',
        vibe_text: 'Ollie time 🛹',
        theme_base: 3,
        is_online: true,
        friend_status: 'friends',
        bio: 'Skater toon',
      },
    ];

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockFriends);

    const friends = await realFriendsService.getFriends();
    expect(friends).toHaveLength(1);
    expect(friends[0].username).toBe('kai_skater');
    expect(friends[0].friendStatus).toBe('friends');
    expect(friends[0].isOnline).toBe(true);
  });

  it('queries real discover users from conversationService.searchUsers', async () => {
    const realUsers = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        username: 'priya_art',
        displayName: 'Priya',
        status: 'online' as const,
        vibeText: 'Painting toons 🎨',
        themeBase: 4 as const,
      },
    ];

    vi.spyOn(conversationService, 'searchUsers').mockResolvedValueOnce(realUsers);

    const discoverUsers = await realFriendsService.getDiscoverUsers('priya', ['Art']);
    expect(discoverUsers).toHaveLength(1);
    expect(discoverUsers[0].username).toBe('priya_art');
    expect(discoverUsers[0].displayName).toBe('Priya');
    expect(discoverUsers[0].friendStatus).toBe('none');
  });

  it('sends friend request and triggers realtime notification', async () => {
    const pushSpy = vi.spyOn(NotificationsService, 'pushNotification');
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      message: 'Friend request sent! ✨',
      status: 'requested',
    });

    const targetId = '33333333-3333-3333-3333-333333333333';
    await realFriendsService.sendRequest(targetId);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    const sentRequests = await realFriendsService.getSentRequests();
    expect(sentRequests.some((u) => u.id === targetId)).toBe(false); // Until user search resolves it
  });

  it('accepts friend request and updates friendship state and notification', async () => {
    const pushSpy = vi.spyOn(NotificationsService, 'pushNotification');
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      message: 'Friend request accepted! 🎉',
      status: 'friends',
    });

    const friendId = '44444444-4444-4444-4444-444444444444';
    await realFriendsService.acceptRequest(friendId);

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Friend request accepted'),
      })
    );
  });
});
