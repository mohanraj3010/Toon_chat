import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conversationService } from '../api/conversationService';
import { apiClient } from '@/services/api/httpClient';

vi.mock('@/services/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Conversation Service & PostgreSQL Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches real conversations from GET /conversations with requiresAuth', async () => {
    const mockDbConversations = [
      {
        id: '11111111-2222-3333-4444-555555555555',
        type: 'direct',
        name: 'Luna Star',
        unreadCount: 2,
        isPinned: true,
        updatedAt: '2026-11-02T12:00:00Z',
        participants: [
          {
            id: 'aaaa1111-0000-0000-0000-000000000001',
            username: 'luna_star',
            displayName: 'Luna Star',
            status: 'online',
            themeBase: 3,
          },
        ],
        lastMessage: {
          id: 'msg-1',
          conversationId: '11111111-2222-3333-4444-555555555555',
          senderId: 'aaaa1111-0000-0000-0000-000000000001',
          sequence: 5,
          content: 'Hey there toon friend!',
          type: 'text',
          createdAt: '2026-11-02T12:00:00Z',
        },
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockDbConversations);

    const result = await conversationService.getConversations();

    expect(apiClient.get).toHaveBeenCalledWith('/conversations', { requiresAuth: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('11111111-2222-3333-4444-555555555555');
    expect(result[0].name).toBe('Luna Star');
    expect(result[0].unreadCount).toBe(2);
    expect(result[0].participants[0].themeBase).toBe(3);
  });

  it('creates or retrieves direct conversation with target user via POST /conversations', async () => {
    const targetUserId = 'target-user-uuid-123';
    const mockCreatedChat = {
      id: 'conv-new-uuid-456',
      type: 'direct',
      name: 'Toon Companion',
      unreadCount: 0,
      isPinned: false,
      updatedAt: '2026-11-02T12:05:00Z',
      participants: [
        {
          id: targetUserId,
          username: 'companion',
          displayName: 'Toon Companion',
          status: 'online',
          themeBase: 5,
        },
      ],
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce(mockCreatedChat);

    const result = await conversationService.createDirectConversation(targetUserId);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/conversations',
      { targetUserId },
      { requiresAuth: true }
    );
    expect(result.id).toBe('conv-new-uuid-456');
    expect(result.participants[0].id).toBe(targetUserId);
  });

  it('searches users via GET /users with query parameter', async () => {
    const mockUsers = [
      {
        id: 'user-789',
        username: 'sparky',
        displayName: 'Sparky Dog',
        status: 'online',
        themeBase: 2,
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockUsers);

    const result = await conversationService.searchUsers('spark');

    expect(apiClient.get).toHaveBeenCalledWith('/users?q=spark', { requiresAuth: true });
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Sparky Dog');
  });

  it('searches users via GET /users without query parameter when empty', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce([]);

    await conversationService.searchUsers('');

    expect(apiClient.get).toHaveBeenCalledWith('/users', { requiresAuth: true });
  });
});

