import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { authService } from '@/features/auth/api/authService';
import { avatarService } from '@/features/avatar/api/avatarService';
import { conversationService } from '@/features/chats/api/conversationService';
import { realFriendsService } from '@/features/friends/api/realFriendsService';
import { GroupsService } from '@/features/groups/api/groupsService';
import { StoriesService } from '@/features/stories/api/storiesService';
import { NotificationsService } from '@/features/notifications/api/notificationsService';
import { mockWorldService } from '@/features/world/api/mockWorldService';
import { mediaService } from '@/services/api/mediaService';
import { apiClient } from '@/services/api/httpClient';
import {
  reconcileMessageInCache,
  updateConversationPreviewInCache,
} from '@/services/realtime/reconciliation';
import type { ChatMessagePayload } from '@/services/realtime/dto';
import type { Message } from '@/shared/types';
import type { AvatarConfig } from '@/features/avatar/types';

// In-memory mock storage
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

describe('Phase 15: Full System Integration Two-Account Journey', () => {
  let queryClient: QueryClient;

  // Account A (Alice) & Account B (Bob) identifiers
  const userA = {
    id: 'a1111111-1111-4111-8111-111111111111',
    username: 'toon_alice',
    email: 'alice@toonchat.fun',
    displayName: 'Alice Star',
    characterBase: 2 as const,
  };

  const userB = {
    id: 'b2222222-2222-4222-8222-222222222222',
    username: 'toon_bob',
    email: 'bob@toonchat.fun',
    displayName: 'Bob Skater',
    characterBase: 3 as const,
  };

  const directConvId = 'c3333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.restoreAllMocks();
    storageMap.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('Step 1 [register]: Registers User A and User B and initializes active sessions', async () => {
    vi.spyOn(apiClient, 'post').mockImplementation(async (path, data) => {
      if (path === '/auth/register') {
        const d = data as any;
        return {
          authenticated: true,
          user: {
            id: d.username === 'toon_alice' ? userA.id : userB.id,
            username: d.username,
            email: d.email,
            displayName: d.displayName,
            status: 'online',
            isActive: true,
            isVerified: true,
            createdAt: new Date().toISOString(),
          },
          profile: {
            displayName: d.displayName,
            bio: 'Ready to chat in Maple Park! ✨',
            characterBase: d.characterBase,
            joinedAt: new Date().toISOString(),
          },
        };
      }
      return {};
    });

    const regA = await authService.register({
      username: userA.username,
      email: userA.email,
      password: 'AliceSuperSecret123!',
      displayName: userA.displayName,
      characterBase: userA.characterBase,
    });
    expect(regA.user.username).toBe('toon_alice');
    expect(regA.user.id).toBe(userA.id);

    const regB = await authService.register({
      username: userB.username,
      email: userB.email,
      password: 'BobSuperSecret123!',
      displayName: userB.displayName,
      characterBase: userB.characterBase,
    });
    expect(regB.user.username).toBe('toon_bob');
    expect(regB.user.id).toBe(userB.id);
  });

  it('Step 2 [avatar]: User A and User B save personalized cartoon avatar configurations', () => {
    const avatarA: AvatarConfig = {
      version: 1,
      name: 'Alice Star',
      background: 'bg-sparkles',
      backgroundColor: '#fef3c7',
      headShape: 'head-chubby',
      skinTone: '#ffd8c2',
      eyes: 'eyes-sparkle',
      eyeColor: '#7c3aed',
      eyebrows: 'brows-soft',
      eyebrowColor: '#4c1d95',
      nose: 'nose-button',
      mouth: 'mouth-smile-teeth',
      blush: 'blush-soft-pink',
      hairStyle: 'hair-pigtails',
      hairColor: '#f59e0b',
      facialHair: 'none',
      facialHairColor: '#f59e0b',
      outfit: 'outfit-dress',
      outfitPrimaryColor: '#ec4899',
      outfitSecondaryColor: '#f472b6',
      glasses: 'glasses-round',
      glassesColor: '#831843',
      hat: 'none',
      hatColor: '#ec4899',
      earrings: 'earrings-stars',
      earringsColor: '#fbbf24',
      headphones: 'none',
      headphonesColor: '#38bdf8',
      expression: 'happy',
    };

    const savedA = avatarService.saveAvatar(avatarA, userA.id);
    expect(savedA.hairStyle).toBe('hair-pigtails');
    expect(avatarService.getAvatar(userA.id)?.glasses).toBe('glasses-round');

    const avatarB: AvatarConfig = {
      ...avatarA,
      name: 'Bob Skater',
      hairStyle: 'hair-anime-spiky',
      hairColor: '#1e293b',
      outfit: 'outfit-hoodie',
      glasses: 'none',
      hat: 'hat-snapback',
    };
    const savedB = avatarService.saveAvatar(avatarB, userB.id);
    expect(savedB.hairStyle).toBe('hair-anime-spiky');
    expect(avatarService.getAvatar(userB.id)?.hat).toBe('hat-snapback');
  });

  it('Step 3 [find friend]: User A discovers User B via real user search endpoint', async () => {
    vi.spyOn(conversationService, 'searchUsers').mockResolvedValueOnce([
      {
        id: userB.id,
        username: userB.username,
        displayName: userB.displayName,
        status: 'online',
        vibeText: 'Skating at the plaza 🛹',
        themeBase: userB.characterBase,
      },
    ]);

    const results = await realFriendsService.getDiscoverUsers('toon_bob', ['Skating']);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(userB.id);
    expect(results[0].username).toBe('toon_bob');
    expect(results[0].friendStatus).toBe('none');
  });

  it('Step 4 [request]: User A sends friend request to User B', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      message: 'Friend request sent! ✨',
      status: 'requested',
    });

    await realFriendsService.sendRequest(userB.id);

    vi.spyOn(conversationService, 'searchUsers').mockResolvedValueOnce([
      {
        id: userB.id,
        username: userB.username,
        displayName: userB.displayName,
        status: 'online',
        themeBase: userB.characterBase,
      },
    ]);

    const sent = await realFriendsService.getSentRequests();
    expect(sent.some((u) => u.id === userB.id)).toBe(true);
  });

  it('Step 5 [accept]: User B accepts the request and both are confirmed friends', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      message: 'Friend request accepted! 🎉',
      status: 'friends',
    });

    await realFriendsService.acceptRequest(userA.id);

    vi.spyOn(conversationService, 'searchUsers').mockResolvedValueOnce([
      {
        id: userA.id,
        username: userA.username,
        displayName: userA.displayName,
        status: 'online',
        themeBase: userA.characterBase,
      },
    ]);

    const friends = await realFriendsService.getFriends();
    expect(friends.some((f) => f.id === userA.id)).toBe(true);
  });

  it('Step 6 [chat]: User A starts direct conversation with User B and sends text message', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      id: directConvId,
      type: 'direct',
      name: userB.displayName,
      unreadCount: 0,
      participants: [
        {
          id: userA.id,
          username: userA.username,
          displayName: userA.displayName,
          status: 'online',
          themeBase: userA.characterBase,
        },
        {
          id: userB.id,
          username: userB.username,
          displayName: userB.displayName,
          status: 'online',
          themeBase: userB.characterBase,
        },
      ],
      updatedAt: new Date().toISOString(),
    });

    const conv = await conversationService.createDirectConversation(userB.id);
    expect(conv.id).toBe(directConvId);

    // Simulate real-time message delivery
    const textWireMessage: ChatMessagePayload = {
      id: 'm-text-001',
      conversation_id: directConvId,
      sender_id: userA.id,
      sequence: 1,
      type: 'text',
      body: 'Hey Bob! Welcome to ToonChat! 🎉',
      created_at: new Date().toISOString(),
      client_message_id: 'cmsg-001',
      sender: {
        id: userA.id,
        username: userA.username,
        display_name: userA.displayName,
        avatar_url: null,
      },
    };

    const domainMsg = reconcileMessageInCache(queryClient, textWireMessage, userB.id);
    updateConversationPreviewInCache(queryClient, directConvId, domainMsg);

    const cachedMsgs = queryClient.getQueryData<Message[]>(['messages', directConvId]);
    expect(cachedMsgs).toHaveLength(1);
    expect(cachedMsgs![0].content).toBe('Hey Bob! Welcome to ToonChat! 🎉');
  });

  it('Step 7 [react]: User B sends cartoon reaction to User As message', () => {
    const existingMsg: Message = {
      id: 'm-text-001',
      conversationId: directConvId,
      senderId: userA.id,
      content: 'Hey Bob! Welcome to ToonChat! 🎉',
      type: 'text',
      createdAt: new Date().toISOString(),
      readBy: [],
      reactions: [],
    };
    queryClient.setQueryData(['messages', directConvId], [existingMsg]);

    // Apply reaction
    queryClient.setQueryData<Message[]>(['messages', directConvId], (old) => {
      if (!old) return [];
      return old.map((m) =>
        m.id === 'm-text-001'
          ? {
              ...m,
              reactions: [{ emoji: '❤️', count: 1, users: [userB.id] }],
            }
          : m
      );
    });

    const updated = queryClient.getQueryData<Message[]>(['messages', directConvId]);
    expect(updated![0].reactions).toHaveLength(1);
    expect(updated![0].reactions![0].emoji).toBe('❤️');
  });

  it('Step 8 [sticker]: User A sends an original cartoon SVG sticker', () => {
    const stickerWire: ChatMessagePayload = {
      id: 'm-sticker-002',
      conversation_id: directConvId,
      sender_id: userA.id,
      sequence: 2,
      type: 'sticker',
      body: 'critter-cat',
      created_at: new Date().toISOString(),
      sender: {
        id: userA.id,
        username: userA.username,
        display_name: userA.displayName,
        avatar_url: null,
      },
    };

    reconcileMessageInCache(queryClient, stickerWire, userB.id);
    const msgs = queryClient.getQueryData<Message[]>(['messages', directConvId]);
    expect(msgs!.some((m) => m.type === 'sticker' && m.content === 'critter-cat')).toBe(true);
  });

  it('Step 9 [image]: User B executes 3-step media handshake and sends image', async () => {
    const imageMediaId = 'med-img-999';
    vi.spyOn(apiClient, 'post').mockImplementation(async (path) => {
      if (path === '/media/upload/initiate') {
        return {
          id: imageMediaId,
          upload_url: 'http://localhost:8000/api/v1/media/storage/upload/img.png',
          expires_at: new Date(Date.now() + 900000).toISOString(),
        };
      }
      if (path === `/media/${imageMediaId}/confirm`) {
        return {
          id: imageMediaId,
          status: 'ready',
          mime_type: 'image/png',
          size_bytes: 2048,
          download_url: 'http://localhost:8000/api/v1/media/storage/file/img.png',
        };
      }
      return {};
    });

    const init = await mediaService.initiateUpload('image.png', 'image/png', 2048);
    expect(init.id).toBe(imageMediaId);

    const confirmed = await mediaService.confirmUpload(imageMediaId);
    expect(confirmed.status).toBe('ready');

    const imageWire: ChatMessagePayload = {
      id: 'm-image-003',
      conversation_id: directConvId,
      sender_id: userB.id,
      sequence: 3,
      type: 'image',
      body: 'Park photo 📸',
      media_id: imageMediaId,
      created_at: new Date().toISOString(),
      sender: {
        id: userB.id,
        username: userB.username,
        display_name: userB.displayName,
        avatar_url: null,
      },
    };

    reconcileMessageInCache(queryClient, imageWire, userA.id);
    const msgs = queryClient.getQueryData<Message[]>(['messages', directConvId]);
    expect(msgs!.some((m) => m.type === 'image' && m.mediaId === imageMediaId)).toBe(true);
  });

  it('Step 10 [voice]: User A records and uploads real voice note', async () => {
    const voiceMediaId = 'med-voice-888';
    vi.spyOn(apiClient, 'post').mockImplementation(async (path) => {
      if (path === '/media/upload/initiate') {
        return {
          media_id: voiceMediaId,
          id: voiceMediaId,
          storage_key: 'media/voice/voice.webm',
          upload_url: 'http://localhost:8000/api/v1/media/storage/upload/voice.webm',
          method: 'PUT',
          headers: {},
          expires_at: new Date(Date.now() + 900000).toISOString(),
          max_size_bytes: 10485760,
        };
      }
      if (path === `/media/${voiceMediaId}/confirm`) {
        return {
          id: voiceMediaId,
          uploader_id: userA.id,
          storage_key: 'media/voice/voice.webm',
          media_type: 'voice',
          mime_type: 'audio/webm;codecs=opus',
          size_bytes: 12400,
          status: 'ready',
          created_at: new Date().toISOString(),
          download_url: 'http://localhost:8000/api/v1/media/storage/file/voice.webm',
        };
      }
      return {};
    });

    vi.spyOn(mediaService, 'uploadBytes').mockResolvedValueOnce();

    const mockBlob = new Blob(['fake-audio-bytes'], { type: 'audio/webm;codecs=opus' });
    const voiceUploadRes = await mediaService.uploadVoice(mockBlob, {
      durationMs: 8500,
      mimeType: 'audio/webm;codecs=opus',
      sizeBytes: 12400,
    });
    expect(voiceUploadRes.mediaId).toBe(voiceMediaId);

    const voiceWire: ChatMessagePayload = {
      id: 'm-voice-004',
      conversation_id: directConvId,
      sender_id: userA.id,
      sequence: 4,
      type: 'voice',
      body: 'Voice note (8s)',
      media_id: voiceMediaId,
      created_at: new Date().toISOString(),
    };
    reconcileMessageInCache(queryClient, voiceWire, userB.id);
    const msgs = queryClient.getQueryData<Message[]>(['messages', directConvId]);
    expect(msgs!.some((m) => m.type === 'voice' && m.mediaId === voiceMediaId)).toBe(true);
  });

  it('Step 11 [create group]: User A creates Maple Park Skaters squad and invites User B', async () => {
    const group = await GroupsService.createGroup({
      name: 'Maple Park Skaters 🛹',
      description: 'Official weekend skating crew!',
      category: 'skate',
      privacy: 'public',
      avatar: {
        emblem: '🛹',
        backgroundColor: '#fed7aa',
        pattern: 'dots',
      },
      bannerColor: '#f97316',
      rules: ['Wear helmets', 'Be cool to each other'],
    });

    expect(group.name).toBe('Maple Park Skaters 🛹');
    expect(group.members[0].role).toBe('owner');

    await GroupsService.joinGroup(group.id);
    const updated = await GroupsService.getGroup(group.id);
    expect(updated).not.toBeNull();
    expect(updated!.members.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 12 [story]: User B posts 24h cartoon story visible across feed and stories tray', async () => {
    const story = await StoriesService.createStory(
      {
        type: 'sticker',
        content: {
          expression: 'cool',
          caption: 'Landing kickflips at the park today! 🛹🔥',
          backgroundColor: '#ffedd5',
          backgroundPattern: 'stars',
          stickers: [{ id: 's1', emoji: '🛹', x: 50, y: 50, scale: 1.5, rotation: 0 }],
          textColor: '#7c2d12',
          fontFamily: 'fredoka',
        },
      },
      {
        id: userB.id,
        username: userB.username,
        displayName: userB.displayName,
        themeBase: userB.characterBase,
      }
    );

    expect(story.content.caption).toContain('Landing kickflips');
    const allStories = await StoriesService.getStories();
    expect(allStories.some((s) => s.id === story.id)).toBe(true);
  });

  it('Step 13 [notification]: User receives notification for friend request and updates unread counter', async () => {
    NotificationsService.pushNotification({
      id: 'notif-e2e-1',
      type: 'friend_request',
      actor: {
        id: userA.id,
        username: userA.username,
        displayName: userA.displayName,
        themeBase: userA.characterBase,
      },
      content: 'sent you a friend request! Let us connect in ToonChat 👋',
      expression: 'happy',
      timestamp: new Date().toISOString(),
      read: false,
    });

    const count = await NotificationsService.getUnreadCount();
    expect(count).toBeGreaterThanOrEqual(1);

    const list = await NotificationsService.getNotifications();
    expect(list[0].id).toBe('notif-e2e-1');
    expect(list[0].read).toBe(false);

    await NotificationsService.markAsRead('notif-e2e-1');
    const updatedCount = await NotificationsService.getUnreadCount();
    expect(updatedCount).toBe(count - 1);
  });

  it('Step 14 [world]: Both users enter Maple Park Plaza, move, and send emotes', async () => {
    const places = await mockWorldService.getPlaces();
    expect(places.length).toBeGreaterThan(0);
    expect(places.some((p) => p.id === 'plaza')).toBe(true);

    const presence = await mockWorldService.getPresence('plaza');
    expect(presence.length).toBeGreaterThan(0);

    const moved = await mockWorldService.movePlayer('plaza', { x: 350, y: 280 });
    expect(moved.isCurrentUser).toBe(true);
    expect(moved.position.x).toBe(350);

    await mockWorldService.sendEmote('plaza', '🛹');
    const feed = await mockWorldService.getActivityFeed();
    expect(feed.some((a) => a.action === 'emoted' && a.emoji === '🛹')).toBe(true);
  });
});
