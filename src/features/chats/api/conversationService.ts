import { apiClient, type RequestOptions } from '@/services/api/httpClient';

export interface ConversationParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: 'online' | 'offline' | 'away' | 'dnd' | string;
  vibeText?: string | null;
  themeBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export interface ConversationLastMessage {
  id: string;
  conversationId: string;
  senderId?: string | null;
  sequence: number;
  content: string;
  type: string;
  createdAt: string;
}

export interface UIChat {
  id: string;
  type: 'direct' | 'group';
  title?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  themeBase?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isTyping?: boolean;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage?: ConversationLastMessage | null;
}

export interface UserSearchItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: 'online' | 'offline' | 'away' | 'dnd' | string;
  vibeText?: string | null;
  themeBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export const conversationService = {
  /**
   * Fetches authoritative user conversations from PostgreSQL.
   */
  async getConversations(token?: string): Promise<UIChat[]> {
    const options: RequestOptions = { requiresAuth: true };
    if (token) {
      options.token = token;
    }
    const data = await apiClient.get<UIChat[]>('/conversations', options);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Creates or resolves a canonical 1-on-1 direct conversation with the target user.
   */
  async createDirectConversation(targetUserId: string, token?: string): Promise<UIChat> {
    const options: RequestOptions = { requiresAuth: true };
    if (token) {
      options.token = token;
    }
    return apiClient.post<UIChat>(
      '/conversations',
      { targetUserId },
      options
    );
  },

  /**
   * Searches active users in PostgreSQL excluding the current user.
   */
  async searchUsers(query?: string, token?: string): Promise<UserSearchItem[]> {
    const cleanQuery = query?.trim();
    const endpoint = cleanQuery ? `/users?q=${encodeURIComponent(cleanQuery)}` : '/users';
    const options: RequestOptions = { requiresAuth: true };
    if (token) {
      options.token = token;
    }
    const data = await apiClient.get<UserSearchItem[]>(endpoint, options);
    return Array.isArray(data) ? data : [];
  },
};

