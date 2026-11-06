import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Message } from '@/shared/types';
import {
  parseInboundFrame,
  mapWireMessageToDomain,
  mapHistoryItemToDomain,
  type ChatMessagePayload,
  type MessageHistoryItemDto,
  type ChatAckPayload,
} from '../dto';
import {
  sortAndDeduplicateMessages,
  reconcileAckInCache,
  reconcileMessageInCache,
  mergeHistoryInCache,
  updateConversationPreviewInCache,
} from '../reconciliation';

describe('Phase 13.2 Media Messaging Integration & Reconciliation', () => {
  let queryClient: QueryClient;
  const conversationId = '8fa8d7a1-3069-4ce3-a006-259fc6c52a32';
  const myUserId = 'c1f7f0aa-b54c-47ea-bd56-621aa906e001';
  const otherUserId = 'b2c8a190-3069-4ce3-a006-118fa906e002';
  const mediaId1 = '3a4f89d1-0000-4000-8000-000000000001';
  const mediaId2 = '3a4f89d1-0000-4000-8000-000000000002';
  const msgId1 = 'd1e7f0aa-b54c-47ea-bd56-621aa906e099';
  const msgId2 = 'd2e7f0aa-b54c-47ea-bd56-621aa906e100';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('DTO and Domain Type Mapping', () => {
    it('validates and parses inbound chat.message for an image attachment', () => {
      const raw = JSON.stringify({
        type: 'chat.message',
        id: 'frame-img-1',
        ts: '2026-11-01T10:00:00.000Z',
        payload: {
          id: msgId1,
          conversation_id: conversationId,
          sender_id: otherUserId,
          sequence: 12,
          client_message_id: 'cmsg_img_100',
          type: 'image',
          body: 'Check out the new ramp!',
          media_id: mediaId1,
          media_url: `/api/v1/media/${mediaId1}/url`,
          reply_to_id: null,
          created_at: '2026-11-01T10:00:00.000Z',
          sender: {
            id: otherUserId,
            username: 'bob',
            display_name: 'Bob Builder',
            avatar_url: '/avatars/bob.svg',
          },
        },
      });

      const parsed = parseInboundFrame(raw);
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('chat.message');
      if (parsed && parsed.type === 'chat.message') {
        expect(parsed.payload.type).toBe('image');
        expect(parsed.payload.media_id).toBe(mediaId1);
        expect(parsed.payload.media_url).toBe(`/api/v1/media/${mediaId1}/url`);

        const domain = mapWireMessageToDomain(parsed.payload, myUserId);
        expect(domain.type).toBe('image');
        expect(domain.mediaId).toBe(mediaId1);
        expect(domain.mediaUrl).toBe(`/api/v1/media/${mediaId1}/url`);
        expect(domain.content).toBe('Check out the new ramp!');
        expect(domain.senderId).toBe(otherUserId);
      }
    });

    it('validates and parses inbound chat.message for a file attachment with metadata', () => {
      const raw = JSON.stringify({
        type: 'chat.message',
        id: 'frame-file-1',
        ts: '2026-11-01T10:01:00.000Z',
        payload: {
          id: msgId2,
          conversation_id: conversationId,
          sender_id: otherUserId,
          sequence: 13,
          client_message_id: 'cmsg_file_200',
          type: 'file',
          body: 'Project Blueprint',
          media_id: mediaId2,
          media_url: `/api/v1/media/${mediaId2}/url`,
          reply_to_id: null,
          created_at: '2026-11-01T10:01:00.000Z',
          sender: {
            id: otherUserId,
            username: 'bob',
            display_name: 'Bob Builder',
            avatar_url: null,
          },
        },
      });

      const parsed = parseInboundFrame(raw);
      expect(parsed).not.toBeNull();
      if (parsed && parsed.type === 'chat.message') {
        expect(parsed.payload.type).toBe('file');
        const domain = mapWireMessageToDomain(parsed.payload, myUserId);
        expect(domain.type).toBe('file');
        expect(domain.mediaId).toBe(mediaId2);
        expect(domain.mediaUrl).toBe(`/api/v1/media/${mediaId2}/url`);
      }
    });

    it('maps REST history DTO items with image and file types to domain messages', () => {
      const historyItems: MessageHistoryItemDto[] = [
        {
          id: msgId1,
          conversation_id: conversationId,
          sequence: 1,
          sender_id: myUserId,
          client_message_id: 'cmsg_h_1',
          type: 'image',
          body: 'Skate park sunset',
          media_id: mediaId1,
          media_url: `/api/v1/media/${mediaId1}/url`,
          reply_to_id: null,
          is_edited: false,
          created_at: '2026-11-01T09:00:00Z',
          sender: { id: myUserId, username: 'alice', display_name: 'Alice', avatar_url: null },
        },
        {
          id: msgId2,
          conversation_id: conversationId,
          sequence: 2,
          sender_id: otherUserId,
          client_message_id: 'cmsg_h_2',
          type: 'file',
          body: 'Ramp_Guidelines.pdf',
          media_id: mediaId2,
          media_url: `/api/v1/media/${mediaId2}/url`,
          reply_to_id: null,
          is_edited: false,
          created_at: '2026-11-01T09:05:00Z',
          sender: { id: otherUserId, username: 'bob', display_name: 'Bob', avatar_url: null },
        },
      ];

      const domainMessages = historyItems.map((item) => mapHistoryItemToDomain(item, myUserId));
      expect(domainMessages[0].type).toBe('image');
      expect(domainMessages[0].mediaId).toBe(mediaId1);
      expect(domainMessages[0].status).toBe('sent'); // My message

      expect(domainMessages[1].type).toBe('file');
      expect(domainMessages[1].mediaId).toBe(mediaId2);
      expect(domainMessages[1].status).toBeUndefined(); // Other user's message
    });
  });

  describe('Optimistic Send & Realtime Reconciliation for Media', () => {
    it('reconciles optimistic image send through ACK and subsequent realtime broadcast', () => {
      const queryKey = ['messages', conversationId];
      const clientMessageId = 'cmsg_opt_img_999';

      // 1. Optimistic image message in cache
      const optimisticMsg: Message = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: myUserId,
        content: 'Park photo',
        type: 'image',
        mediaId: mediaId1,
        mediaUrl: 'blob:http://localhost:3000/mock-blob-123',
        createdAt: '2026-11-01T10:10:00.000Z',
        readBy: [],
        status: 'sending',
      };
      queryClient.setQueryData<Message[]>(queryKey, [optimisticMsg]);

      expect(queryClient.getQueryData<Message[]>(queryKey)?.[0].status).toBe('sending');

      // 2. chat.ack arrives from backend
      const ackPayload: ChatAckPayload = {
        client_message_id: clientMessageId,
        message_id: msgId1,
        conversation_id: conversationId,
        sequence: 25,
        created_at: '2026-11-01T10:10:01.000Z',
        status: 'sent',
      };
      reconcileAckInCache(queryClient, ackPayload);

      const afterAck = queryClient.getQueryData<Message[]>(queryKey) || [];
      expect(afterAck).toHaveLength(1);
      expect(afterAck[0].id).toBe(msgId1);
      expect(afterAck[0].status).toBe('sent');
      expect(afterAck[0].sequence).toBe(25);
      expect(afterAck[0].mediaId).toBe(mediaId1);
      // Blob preview is retained until authoritative frame or refreshed
      expect(afterAck[0].mediaUrl).toBe('blob:http://localhost:3000/mock-blob-123');

      // 3. chat.message arrives for the same message (broadcasted back)
      const chatMessagePayload: ChatMessagePayload = {
        id: msgId1,
        conversation_id: conversationId,
        sender_id: myUserId,
        sequence: 25,
        client_message_id: clientMessageId,
        type: 'image',
        body: 'Park photo',
        media_id: mediaId1,
        media_url: `/api/v1/media/${mediaId1}/url`,
        reply_to_id: null,
        created_at: '2026-11-01T10:10:01.000Z',
        sender: { id: myUserId, username: 'alice', display_name: 'Alice', avatar_url: null },
      };
      reconcileMessageInCache(queryClient, chatMessagePayload, myUserId);

      // Must remain deduplicated (length 1) with authoritative media_url
      const afterBroadcast = queryClient.getQueryData<Message[]>(queryKey) || [];
      expect(afterBroadcast).toHaveLength(1);
      expect(afterBroadcast[0].id).toBe(msgId1);
      expect(afterBroadcast[0].mediaUrl).toBe(`/api/v1/media/${mediaId1}/url`);
    });

    it('handles out-of-order arrival: chat.message arrives BEFORE chat.ack', () => {
      const queryKey = ['messages', conversationId];
      const clientMessageId = 'cmsg_ooo_file_888';

      // 1. Optimistic file message
      const optimisticMsg: Message = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: myUserId,
        content: 'Report.pdf',
        type: 'file',
        mediaId: mediaId2,
        fileName: 'Report.pdf',
        fileSize: 1024 * 1024,
        mimeType: 'application/pdf',
        createdAt: '2026-11-01T10:15:00.000Z',
        readBy: [],
        status: 'sending',
      };
      queryClient.setQueryData<Message[]>(queryKey, [optimisticMsg]);

      // 2. chat.message arrives first
      const chatMessagePayload: ChatMessagePayload = {
        id: msgId2,
        conversation_id: conversationId,
        sender_id: myUserId,
        sequence: 30,
        client_message_id: clientMessageId,
        type: 'file',
        body: 'Report.pdf',
        media_id: mediaId2,
        media_url: `/api/v1/media/${mediaId2}/url`,
        reply_to_id: null,
        created_at: '2026-11-01T10:15:01.000Z',
        sender: { id: myUserId, username: 'alice', display_name: 'Alice', avatar_url: null },
      };
      reconcileMessageInCache(queryClient, chatMessagePayload, myUserId);

      let messages = queryClient.getQueryData<Message[]>(queryKey) || [];
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe(msgId2);
      expect(messages[0].sequence).toBe(30);

      // 3. chat.ack arrives later
      const ackPayload: ChatAckPayload = {
        client_message_id: clientMessageId,
        message_id: msgId2,
        conversation_id: conversationId,
        sequence: 30,
        created_at: '2026-11-01T10:15:01.000Z',
        status: 'sent',
      };
      reconcileAckInCache(queryClient, ackPayload);

      messages = queryClient.getQueryData<Message[]>(queryKey) || [];
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe(msgId2);
      expect(messages[0].status).toBe('sent');
    });

    it('reconciles REST history merge without duplicating existing media messages', () => {
      const queryKey = ['messages', conversationId];

      const existingMsg: Message = {
        id: msgId1,
        conversationId,
        senderId: otherUserId,
        content: 'Sunset picture',
        type: 'image',
        mediaId: mediaId1,
        mediaUrl: `/api/v1/media/${mediaId1}/url`,
        sequence: 10,
        createdAt: '2026-11-01T10:00:00Z',
        readBy: [],
      };
      queryClient.setQueryData<Message[]>(queryKey, [existingMsg]);

      // History page containing sequence 9, 10, 11
      const historyPage: MessageHistoryItemDto[] = [
        {
          id: '11111111-0000-4000-8000-000000000009',
          conversation_id: conversationId,
          sequence: 9,
          sender_id: myUserId,
          client_message_id: 'cmsg_9',
          type: 'text',
          body: 'Hello',
          media_id: null,
          media_url: null,
          reply_to_id: null,
          is_edited: false,
          created_at: '2026-11-01T09:59:00Z',
          sender: { id: myUserId, username: 'alice', display_name: 'Alice', avatar_url: null },
        },
        {
          id: msgId1,
          conversation_id: conversationId,
          sequence: 10,
          sender_id: otherUserId,
          client_message_id: 'cmsg_10',
          type: 'image',
          body: 'Sunset picture',
          media_id: mediaId1,
          media_url: `/api/v1/media/${mediaId1}/url`,
          reply_to_id: null,
          is_edited: false,
          created_at: '2026-11-01T10:00:00Z',
          sender: { id: otherUserId, username: 'bob', display_name: 'Bob', avatar_url: null },
        },
        {
          id: msgId2,
          conversation_id: conversationId,
          sequence: 11,
          sender_id: otherUserId,
          client_message_id: 'cmsg_11',
          type: 'file',
          body: 'Notes.txt',
          media_id: mediaId2,
          media_url: `/api/v1/media/${mediaId2}/url`,
          reply_to_id: null,
          is_edited: false,
          created_at: '2026-11-01T10:02:00Z',
          sender: { id: otherUserId, username: 'bob', display_name: 'Bob', avatar_url: null },
        },
      ];

      const domainPage = historyPage.map((item) => mapHistoryItemToDomain(item, myUserId));
      mergeHistoryInCache(queryClient, conversationId, domainPage);

      const merged = queryClient.getQueryData<Message[]>(queryKey) || [];
      expect(merged).toHaveLength(3);
      expect(merged.map((m) => m.sequence)).toEqual([9, 10, 11]);
      expect(merged[1].type).toBe('image');
      expect(merged[2].type).toBe('file');
    });

    it('maintains strict sequence ordering when sorting mixed text and media messages', () => {
      const messages: Message[] = [
        {
          id: 'm-3',
          conversationId,
          senderId: myUserId,
          content: 'doc.pdf',
          type: 'file',
          sequence: 3,
          createdAt: '2026-11-01T10:03:00Z',
          readBy: [],
        },
        {
          id: 'cmsg-pending',
          clientMessageId: 'cmsg-pending',
          conversationId,
          senderId: myUserId,
          content: 'img.png',
          type: 'image',
          createdAt: '2026-11-01T10:05:00Z',
          readBy: [],
          status: 'sending',
        },
        {
          id: 'm-1',
          conversationId,
          senderId: otherUserId,
          content: 'Hello',
          type: 'text',
          sequence: 1,
          createdAt: '2026-11-01T10:01:00Z',
          readBy: [],
        },
        {
          id: 'm-2',
          conversationId,
          senderId: myUserId,
          content: 'pic.jpg',
          type: 'image',
          sequence: 2,
          createdAt: '2026-11-01T10:02:00Z',
          readBy: [],
        },
      ];

      const sorted = sortAndDeduplicateMessages(messages);
      expect(sorted.map((m) => m.id)).toEqual(['m-1', 'm-2', 'm-3', 'cmsg-pending']);
    });
  });

  describe('Conversation Previews for Media Messages', () => {
    it('updates conversation preview for image message', () => {
      queryClient.setQueryData(['conversations'], [
        {
          id: conversationId,
          type: 'direct',
          name: 'Bob',
          avatarUrl: null,
          isOnline: true,
          unreadCount: 0,
          lastMessage: {
            id: 'old-msg',
            conversationId,
            senderId: otherUserId,
            content: 'Old text',
            type: 'text',
            createdAt: '2026-11-01T09:00:00Z',
            readBy: [],
          },
          updatedAt: '2026-11-01T09:00:00Z',
        },
      ]);

      const imagePayload: ChatMessagePayload = {
        id: msgId1,
        conversation_id: conversationId,
        sender_id: otherUserId,
        sequence: 4,
        client_message_id: 'cmsg_img_55',
        type: 'image',
        body: 'Sunset at the park',
        media_id: mediaId1,
        media_url: `/api/v1/media/${mediaId1}/url`,
        reply_to_id: null,
        created_at: '2026-11-01T10:30:00.000Z',
        sender: { id: otherUserId, username: 'bob', display_name: 'Bob', avatar_url: null },
      };

      const domainMsg = mapWireMessageToDomain(imagePayload, myUserId);
      updateConversationPreviewInCache(queryClient, conversationId, domainMsg, true);

      const convs = queryClient.getQueryData<any[]>(['conversations']);
      expect(convs?.[0].lastMessage?.type).toBe('image');
      expect(convs?.[0].lastMessage?.content).toBe('Sunset at the park');
      expect(convs?.[0].unreadCount).toBe(1);
    });
  });
});
