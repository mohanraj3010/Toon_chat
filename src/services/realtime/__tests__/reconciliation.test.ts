import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Message } from '@/shared/types';
import {
  sortAndDeduplicateMessages,
  reconcileAckInCache,
  reconcileMessageInCache,
  reconcileReadInCache,
  reconcileDeliveredInCache,
  mergeHistoryInCache,
  updateConversationPreviewInCache,
  clearConversationUnreadInCache,
} from '../reconciliation';
import type {
  ChatAckPayload,
  ChatMessagePayload,
  ChatReadBroadcastPayload,
  ChatDeliveredBroadcastPayload,
} from '../dto';

describe('TanStack Query Cache Reconciliation', () => {
  let queryClient: QueryClient;
  const conversationId = '8fa8d7a1-3069-4ce3-a006-259fc6c52a32';
  const myUserId = 'c1f7f0aa-b54c-47ea-bd56-621aa906e001';
  const otherUserId = 'b2c8a190-3069-4ce3-a006-118fa906e002';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('orders messages by sequence ASC, placing optimistic pending messages at the tail', () => {
    const messages: Message[] = [
      {
        id: 'msg-3',
        conversationId,
        senderId: myUserId,
        content: 'Third',
        type: 'text',
        createdAt: '2026-10-27T12:00:03Z',
        readBy: [],
        sequence: 3,
      },
      {
        id: 'cmsg_optimistic',
        clientMessageId: 'cmsg_optimistic',
        conversationId,
        senderId: myUserId,
        content: 'Pending',
        type: 'text',
        createdAt: '2026-10-27T12:00:05Z',
        readBy: [],
        status: 'sending',
      },
      {
        id: 'msg-1',
        conversationId,
        senderId: otherUserId,
        content: 'First',
        type: 'text',
        createdAt: '2026-10-27T12:00:01Z',
        readBy: [],
        sequence: 1,
      },
      {
        id: 'msg-2',
        conversationId,
        senderId: myUserId,
        content: 'Second',
        type: 'text',
        createdAt: '2026-10-27T12:00:02Z',
        readBy: [],
        sequence: 2,
      },
    ];

    const sorted = sortAndDeduplicateMessages(messages);
    expect(sorted.map((m) => m.content)).toEqual(['First', 'Second', 'Third', 'Pending']);
  });

  it('handles non-contiguous sequence numbers and out-of-order arrivals gracefully', () => {
    // E.g. sequence 140, then 143 arrives, then 141 arrives (soft-deleted 142)
    const arrivals: Message[] = [
      {
        id: 'm-140',
        conversationId,
        senderId: myUserId,
        content: '140',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 140,
      },
      {
        id: 'm-143',
        conversationId,
        senderId: otherUserId,
        content: '143',
        type: 'text',
        createdAt: '2026-10-27T12:00:03Z',
        readBy: [],
        sequence: 143,
      },
      {
        id: 'm-141',
        conversationId,
        senderId: myUserId,
        content: '141',
        type: 'text',
        createdAt: '2026-10-27T12:00:01Z',
        readBy: [],
        sequence: 141,
      },
    ];

    const sorted = sortAndDeduplicateMessages(arrivals);
    expect(sorted.map((m) => m.sequence)).toEqual([140, 141, 143]);
  });

  it('deduplicates messages sharing the same id or clientMessageId', () => {
    const list: Message[] = [
      {
        id: 'cmsg_1',
        clientMessageId: 'cmsg_1',
        conversationId,
        senderId: myUserId,
        content: 'Duplicate text',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        status: 'sending',
      },
      {
        id: 'server-id-1',
        clientMessageId: 'cmsg_1',
        conversationId,
        senderId: myUserId,
        content: 'Duplicate text',
        type: 'text',
        createdAt: '2026-10-27T12:00:01Z',
        readBy: [],
        sequence: 10,
        status: 'sent',
      },
    ];

    const deduped = sortAndDeduplicateMessages(list);
    expect(deduped.length).toBe(1);
    expect(deduped[0].id).toBe('server-id-1');
    expect(deduped[0].sequence).toBe(10);
  });

  it('reconciles chat.ack into an optimistic message in cache', () => {
    const queryKey = ['messages', conversationId];
    const clientMsgId = 'cmsg_test_ack_1';

    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        conversationId,
        senderId: myUserId,
        content: 'Optimistic send',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        status: 'sending',
      },
    ]);

    const ack: ChatAckPayload = {
      client_message_id: clientMsgId,
      message_id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
      conversation_id: conversationId,
      sequence: 50,
      created_at: '2026-10-27T12:00:00.500Z',
      status: 'sent',
    };

    reconcileAckInCache(queryClient, ack);

    const updated = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe('d1e7f0aa-b54c-47ea-bd56-621aa906e099');
    expect(updated[0].sequence).toBe(50);
    expect(updated[0].status).toBe('sent');
  });

  it('reconciles chat.message broadcast without duplicating optimistic message', () => {
    const queryKey = ['messages', conversationId];
    const clientMsgId = 'cmsg_test_msg_1';

    // User sent optimistic message
    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        conversationId,
        senderId: myUserId,
        content: 'Hello World',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        status: 'sending',
      },
    ]);

    // Broadcast arrives from server
    const broadcast: ChatMessagePayload = {
      id: 'srv_assigned_uuid_1',
      conversation_id: conversationId,
      sender_id: myUserId,
      sequence: 51,
      client_message_id: clientMsgId,
      type: 'text',
      body: 'Hello World',
      media_id: null,
      media_url: null,
      reply_to_id: null,
      created_at: '2026-10-27T12:00:00.600Z',
      sender: {
        id: myUserId,
        username: 'luna',
        display_name: 'Luna',
      },
    };

    reconcileMessageInCache(queryClient, broadcast, myUserId);

    const cached = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe('srv_assigned_uuid_1');
    expect(cached[0].sequence).toBe(51);
    expect(cached[0].status).toBe('sent');
  });

  it('advances message read status when chat.read arrives for messages <= last_read_seq', () => {
    const queryKey = ['messages', conversationId];

    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: 'msg-1',
        conversationId,
        senderId: myUserId,
        content: 'Read this',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 10,
        status: 'sent',
      },
      {
        id: 'msg-2',
        conversationId,
        senderId: myUserId,
        content: 'Unread next',
        type: 'text',
        createdAt: '2026-10-27T12:00:01Z',
        readBy: [],
        sequence: 15,
        status: 'sent',
      },
    ]);

    const readPayload: ChatReadBroadcastPayload = {
      conversation_id: conversationId,
      user_id: otherUserId,
      last_read_seq: 10,
      read_at: '2026-10-27T12:00:05Z',
    };

    reconcileReadInCache(queryClient, readPayload, myUserId);

    const messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages.find((m) => m.id === 'msg-1')?.status).toBe('read');
    expect(messages.find((m) => m.id === 'msg-2')?.status).toBe('sent');
  });

  it('advances message delivered status without downgrading read status', () => {
    const queryKey = ['messages', conversationId];

    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: 'msg-1',
        conversationId,
        senderId: myUserId,
        content: 'Already read',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 10,
        status: 'read',
      },
      {
        id: 'msg-2',
        conversationId,
        senderId: myUserId,
        content: 'Now delivered',
        type: 'text',
        createdAt: '2026-10-27T12:00:01Z',
        readBy: [],
        sequence: 11,
        status: 'sent',
      },
    ]);

    const delivPayload: ChatDeliveredBroadcastPayload = {
      conversation_id: conversationId,
      message_id: 'msg-2',
      sequence: 11,
      user_id: otherUserId,
      delivered_at: '2026-10-27T12:00:03Z',
    };

    reconcileDeliveredInCache(queryClient, delivPayload, myUserId);

    const messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages.find((m) => m.id === 'msg-1')?.status).toBe('read');
    expect(messages.find((m) => m.id === 'msg-2')?.status).toBe('delivered');
  });

  it('merges history and catch-up batches cleanly without duplicates', () => {
    const queryKey = ['messages', conversationId];

    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: 'm-2',
        conversationId,
        senderId: myUserId,
        content: 'Two',
        type: 'text',
        createdAt: '2026-10-27T12:00:02Z',
        readBy: [],
        sequence: 2,
      },
    ]);

    const batch: Message[] = [
      {
        id: 'm-1',
        conversationId,
        senderId: otherUserId,
        content: 'One',
        type: 'text',
        createdAt: '2026-10-27T12:00:01Z',
        readBy: [],
        sequence: 1,
      },
      {
        id: 'm-2', // Duplicate of existing
        conversationId,
        senderId: myUserId,
        content: 'Two',
        type: 'text',
        createdAt: '2026-10-27T12:00:02Z',
        readBy: [],
        sequence: 2,
      },
      {
        id: 'm-3',
        conversationId,
        senderId: myUserId,
        content: 'Three',
        type: 'text',
        createdAt: '2026-10-27T12:00:03Z',
        readBy: [],
        sequence: 3,
      },
    ];

    mergeHistoryInCache(queryClient, conversationId, batch);

    const updated = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(updated.length).toBe(3);
    expect(updated.map((m) => m.sequence)).toEqual([1, 2, 3]);
  });

  it('isolates cache per conversationId avoiding stale cross-conversation leaks', () => {
    const convA = '8fa8d7a1-3069-4ce3-a006-259fc6c52a32';
    const convB = 'c1f7f0aa-b54c-47ea-bd56-621aa906e001';

    queryClient.setQueryData(['messages', convA], [
      {
        id: 'msg-a',
        conversationId: convA,
        senderId: myUserId,
        content: 'Chat A',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 1,
      },
    ]);

    queryClient.setQueryData(['messages', convB], [
      {
        id: 'msg-b',
        conversationId: convB,
        senderId: otherUserId,
        content: 'Chat B',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 1,
      },
    ]);

    const cachedA = queryClient.getQueryData<Message[]>(['messages', convA]);
    const cachedB = queryClient.getQueryData<Message[]>(['messages', convB]);

    expect(cachedA?.[0].content).toBe('Chat A');
    expect(cachedB?.[0].content).toBe('Chat B');
  });

  it('updates conversation preview and unread count in conversations query cache', () => {
    queryClient.setQueryData(['conversations'], [
      {
        id: conversationId,
        type: 'direct',
        participants: [],
        unreadCount: 0,
        updatedAt: '2026-10-27T12:00:00Z',
      },
    ]);

    const incomingMsg: Message = {
      id: 'msg-new',
      conversationId,
      senderId: otherUserId,
      content: 'Hey there! 🎈',
      type: 'text',
      createdAt: '2026-10-27T12:05:00Z',
      readBy: [],
      sequence: 5,
    };

    updateConversationPreviewInCache(queryClient, conversationId, incomingMsg, true);

    const conversations = queryClient.getQueryData<Array<{ lastMessage?: Message; unreadCount: number; updatedAt: string }>>(['conversations']);
    expect(conversations?.[0].lastMessage?.content).toBe('Hey there! 🎈');
    expect(conversations?.[0].unreadCount).toBe(1);
    expect(conversations?.[0].updatedAt).toBe('2026-10-27T12:05:00Z');

    // Read receipt clears unread
    clearConversationUnreadInCache(queryClient, conversationId);
    const updatedConvs = queryClient.getQueryData<Array<{ unreadCount: number }>>(['conversations']);
    expect(updatedConvs?.[0].unreadCount).toBe(0);
  });
});
