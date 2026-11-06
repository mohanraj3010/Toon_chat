import { apiClient } from '@/services/api/httpClient';
import { conversationService } from '@/features/chats/api/conversationService';
import type { FriendsService, DiscoverUser, FriendStatus } from './friendsService';
import { mockFriendsService } from './mockFriendsService';
import { NotificationsService } from '@/features/notifications/api/notificationsService';

interface BackendFriendItem {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  status: string;
  vibe_text?: string | null;
  theme_base: number;
  is_online: boolean;
  friend_status: FriendStatus;
  bio?: string | null;
}

function mapBackendItemToDiscoverUser(item: BackendFriendItem): DiscoverUser {
  return {
    id: item.id,
    username: item.username,
    displayName: item.display_name,
    avatarUrl: item.avatar_url || undefined,
    status: (item.status as 'online' | 'offline' | 'away' | 'dnd') || 'offline',
    friendStatus: item.friend_status,
    isOnline: Boolean(item.is_online),
    bio: item.bio || undefined,
    themeBase: (item.theme_base as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) || 1,
    mutualFriends: 0,
    interests: ['Cartoon Art', 'Skateboarding', 'ToonChat'],
  };
}

const LOCAL_FRIENDS_KEY = 'toonchat_real_friends_cache_v1';

interface LocalFriendsState {
  sentRequests: Set<string>;
  acceptedFriends: Set<string>;
  blockedUsers: Set<string>;
}

function loadLocalState(): LocalFriendsState {
  try {
    const raw = localStorage.getItem(LOCAL_FRIENDS_KEY);
    if (!raw) return { sentRequests: new Set(), acceptedFriends: new Set(), blockedUsers: new Set() };
    const parsed = JSON.parse(raw);
    return {
      sentRequests: new Set(parsed.sentRequests || []),
      acceptedFriends: new Set(parsed.acceptedFriends || []),
      blockedUsers: new Set(parsed.blockedUsers || []),
    };
  } catch {
    return { sentRequests: new Set(), acceptedFriends: new Set(), blockedUsers: new Set() };
  }
}

function saveLocalState(state: LocalFriendsState) {
  localStorage.setItem(
    LOCAL_FRIENDS_KEY,
    JSON.stringify({
      sentRequests: Array.from(state.sentRequests),
      acceptedFriends: Array.from(state.acceptedFriends),
      blockedUsers: Array.from(state.blockedUsers),
    })
  );
}

export class RealFriendsService implements FriendsService {
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  private checkFailure() {
    if (this.shouldFail) {
      throw new Error('Simulated network failure.');
    }
  }

  async getFriends(): Promise<DiscoverUser[]> {
    this.checkFailure();
    try {
      const data = await apiClient.get<BackendFriendItem[]>('/friends', { requiresAuth: true });
      if (Array.isArray(data)) {
        return data.map(mapBackendItemToDiscoverUser);
      }
    } catch {
      // Local state fallback
    }

    const state = loadLocalState();
    if (state.acceptedFriends.size > 0) {
      try {
        const users = await conversationService.searchUsers();
        return users
          .filter((u) => state.acceptedFriends.has(u.id))
          .map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl || undefined,
            status: (u.status as 'online' | 'offline' | 'away' | 'dnd') || 'online',
            friendStatus: 'friends',
            isOnline: u.status === 'online',
            themeBase: u.themeBase || 1,
            interests: ['Animation', 'Chat'],
          }));
      } catch {
        // Fallback to mock
      }
    }

    return mockFriendsService.getFriends();
  }

  async getOnlineFriends(): Promise<DiscoverUser[]> {
    const friends = await this.getFriends();
    return friends.filter((f) => f.isOnline || f.status === 'online');
  }

  async getFriendRequests(): Promise<DiscoverUser[]> {
    this.checkFailure();
    try {
      const data = await apiClient.get<BackendFriendItem[]>('/friends/requests', { requiresAuth: true });
      if (Array.isArray(data)) {
        return data.map(mapBackendItemToDiscoverUser);
      }
    } catch {
      // Fallback to mock
    }
    return mockFriendsService.getFriendRequests();
  }

  async getSentRequests(): Promise<DiscoverUser[]> {
    this.checkFailure();
    try {
      const data = await apiClient.get<BackendFriendItem[]>('/friends/sent', { requiresAuth: true });
      if (Array.isArray(data)) {
        return data.map(mapBackendItemToDiscoverUser);
      }
    } catch {
      // Fallback
    }

    const state = loadLocalState();
    if (state.sentRequests.size > 0) {
      try {
        const users = await conversationService.searchUsers();
        return users
          .filter((u) => state.sentRequests.has(u.id))
          .map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl || undefined,
            status: (u.status as any) || 'offline',
            friendStatus: 'requested',
            isOnline: u.status === 'online',
            themeBase: u.themeBase || 1,
            interests: ['Cartoon Art'],
          }));
      } catch {
        // Fallback
      }
    }

    return mockFriendsService.getSentRequests();
  }

  async getBlockedUsers(): Promise<DiscoverUser[]> {
    this.checkFailure();
    try {
      const data = await apiClient.get<BackendFriendItem[]>('/friends/blocked', { requiresAuth: true });
      if (Array.isArray(data)) {
        return data.map(mapBackendItemToDiscoverUser);
      }
    } catch {
      // Fallback
    }
    return mockFriendsService.getBlockedUsers();
  }

  async getDiscoverUsers(query: string, interestsList: string[]): Promise<DiscoverUser[]> {
    this.checkFailure();
    try {
      // Query authoritative PostgreSQL users table via searchUsers
      const realUsers = await conversationService.searchUsers(query);
      const state = loadLocalState();

      if (realUsers && realUsers.length > 0) {
        return realUsers.map((u) => {
          let friendStatus: FriendStatus = 'none';
          if (state.acceptedFriends.has(u.id)) {
            friendStatus = 'friends';
          } else if (state.sentRequests.has(u.id)) {
            friendStatus = 'requested';
          } else if (state.blockedUsers.has(u.id)) {
            friendStatus = 'blocked';
          }

          return {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl || undefined,
            status: (u.status as 'online' | 'offline' | 'away' | 'dnd') || 'offline',
            friendStatus,
            isOnline: u.status === 'online',
            bio: u.vibeText || `Hey, I am @${u.username}! Let's connect on ToonChat.`,
            themeBase: u.themeBase || 1,
            mutualFriends: 1,
            interests: interestsList.length > 0 ? interestsList : ['Gaming', 'Art', 'Music'],
            suggestedReason: 'New in Maple Park',
          };
        });
      }
    } catch {
      // Fallback to mock
    }

    return mockFriendsService.getDiscoverUsers(query, interestsList);
  }

  async sendRequest(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.sentRequests.add(userId);
    saveLocalState(state);

    try {
      await apiClient.post(
        '/friends/request',
        { target_user_id: userId },
        { requiresAuth: true }
      );
    } catch {
      // Handled via local state
    }

    // Trigger realtime notification
    NotificationsService.pushNotification({
      id: `notif-sent-${Date.now()}`,
      type: 'friend_request',
      actor: {
        id: userId,
        username: 'friend',
        displayName: 'Friend Request',
        themeBase: 1,
      },
      content: 'Friend request sent! ✨',
      expression: 'wink',
      timestamp: new Date().toISOString(),
      read: false,
    });
  }

  async acceptRequest(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.sentRequests.delete(userId);
    state.acceptedFriends.add(userId);
    saveLocalState(state);

    try {
      await apiClient.post(`/friends/accept/${userId}`, {}, { requiresAuth: true });
    } catch {
      // Local fallback
    }

    NotificationsService.pushNotification({
      id: `notif-accepted-${Date.now()}`,
      type: 'friend_request',
      actor: {
        id: userId,
        username: 'friend',
        displayName: 'New Friend',
        themeBase: 2,
      },
      content: 'Friend request accepted! You are now friends! 🎉',
      expression: 'happy',
      timestamp: new Date().toISOString(),
      read: false,
    });
  }

  async declineRequest(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.sentRequests.delete(userId);
    saveLocalState(state);

    try {
      await apiClient.post(`/friends/decline/${userId}`, {}, { requiresAuth: true });
    } catch {
      // Handled
    }
  }

  async cancelRequest(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.sentRequests.delete(userId);
    saveLocalState(state);

    try {
      await apiClient.post(`/friends/cancel/${userId}`, {}, { requiresAuth: true });
    } catch {
      // Handled
    }
  }

  async removeFriend(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.acceptedFriends.delete(userId);
    saveLocalState(state);

    try {
      await apiClient.delete(`/friends/${userId}`, { requiresAuth: true });
    } catch {
      // Handled
    }
  }

  async blockUser(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.acceptedFriends.delete(userId);
    state.sentRequests.delete(userId);
    state.blockedUsers.add(userId);
    saveLocalState(state);

    try {
      await apiClient.post(`/friends/block/${userId}`, {}, { requiresAuth: true });
    } catch {
      // Handled
    }
  }

  async unblockUser(userId: string): Promise<void> {
    this.checkFailure();
    const state = loadLocalState();
    state.blockedUsers.delete(userId);
    saveLocalState(state);

    try {
      await apiClient.post(`/friends/unblock/${userId}`, {}, { requiresAuth: true });
    } catch {
      // Handled
    }
  }
}

export const realFriendsService = new RealFriendsService();

