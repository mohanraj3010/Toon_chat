import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Message } from '@/shared/types';
import {
  reconcileAckInCache,
  reconcileMessageInCache,
  reconcileReadInCache,
  reconcileDeliveredInCache,
  mergeHistoryInCache,
} from '../reconciliation';
import type {
  ChatAckPayload,
  ChatMessagePayload,
  ChatReadBroadcastPayload,
  ChatDeliveredBroadcastPayload,
} from '../dto';

describe('End-to-End Chat & Realtime Reconciliation Flows', () => {
  let queryClient: QueryClient;
  const conversationId = '8fa8d7a1-3069-4ce3-a006-259fc6c52a32';
  const myUserId = 'user_alice_uuid';
  const otherUserId = 'user_bob_uuid';

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

  it('runs complete message lifecycle: compose -> sending -> sent (ACK) -> delivered -> read', () => {
    const queryKey = ['messages', conversationId];
    const clientMessageId = 'cmsg_flow_001';

    // 1. Optimistic render in compose state
    const optimisticMsg: Message = {
      id: clientMessageId,
      clientMessageId,
      conversationId,
      senderId: myUserId,
      content: 'Hey Bob! Look at this skate ramp 🛹',
      type: 'text',
      createdAt: '2026-10-27T12:00:00.000Z',
      readBy: [],
      status: 'sending',
    };
    queryClient.setQueryData<Message[]>(queryKey, [optimisticMsg]);

    let messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages[0].status).toBe('sending');

    // 2. Server commits to PostgreSQL and responds with chat.ack
    const ackPayload: ChatAckPayload = {
      client_message_id: clientMessageId,
      message_id: 'srv_msg_1001',
      conversation_id: conversationId,
      sequence: 142,
      created_at: '2026-10-27T12:00:00.180Z',
      status: 'sent',
    };
    reconcileAckInCache(queryClient, ackPayload);

    messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages[0].id).toBe('srv_msg_1001');
    expect(messages[0].sequence).toBe(142);
    expect(messages[0].status).toBe('sent');

    // 3. Recipient device acknowledges receipt (chat.delivered)
    const delivPayload: ChatDeliveredBroadcastPayload = {
      conversation_id: conversationId,
      message_id: 'srv_msg_1001',
      sequence: 142,
      user_id: otherUserId,
      delivered_at: '2026-10-27T12:00:01.000Z',
    };
    reconcileDeliveredInCache(queryClient, delivPayload, myUserId);

    messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages[0].status).toBe('delivered');

    // 4. Recipient opens chat and marks read (chat.read)
    const readPayload: ChatReadBroadcastPayload = {
      conversation_id: conversationId,
      user_id: otherUserId,
      last_read_seq: 142,
      read_at: '2026-10-27T12:00:02.000Z',
    };
    reconcileReadInCache(queryClient, readPayload, myUserId);

    messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages[0].status).toBe('read');
    expect(messages[0].readBy).toContain(otherUserId);
  });

  it('preserves client_message_id during retry after network failure', () => {
    const queryKey = ['messages', conversationId];
    const clientMessageId = 'cmsg_retry_test';

    // Message failed to send
    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: myUserId,
        content: 'Failed message',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        status: 'failed',
      },
    ]);

    // Retry sends with SAME clientMessageId
    queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
      old.map((m) =>
        m.clientMessageId === clientMessageId ? { ...m, status: 'sending' } : m
      )
    );

    let messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages[0].status).toBe('sending');
    expect(messages[0].clientMessageId).toBe(clientMessageId);

    // Server returns ACK for the retried message
    const ack: ChatAckPayload = {
      client_message_id: clientMessageId,
      message_id: 'srv_msg_retry_success',
      conversation_id: conversationId,
      sequence: 143,
      created_at: '2026-10-27T12:00:05Z',
      status: 'sent',
    };
    reconcileAckInCache(queryClient, ack);

    messages = queryClient.getQueryData<Message[]>(queryKey) || [];
    expect(messages.length).toBe(1);
    expect(messages[0].id).toBe('srv_msg_retry_success');
    expect(messages[0].status).toBe('sent');
  });

  it('resolves race condition between REST history response and realtime socket broadcast', () => {
    const queryKey = ['messages', conversationId];

    // Realtime broadcast arrives FIRST (low latency)
    const realtimeMsg: ChatMessagePayload = {
      id: 'srv_race_msg',
      conversation_id: conversationId,
      sender_id: otherUserId,
      sequence: 50,
      client_message_id: 'cmsg_race_1',
      type: 'text',
      body: 'Fast socket message',
      media_id: null,
      media_url: null,
      reply_to_id: null,
      created_at: '2026-10-27T12:00:00Z',
      sender: {
        id: otherUserId,
        username: 'bob',
        display_name: 'Bob',
      },
    };
    reconcileMessageInCache(queryClient, realtimeMsg, myUserId);

    // Stale REST history arrives SECOND (slow database cursor query)
    const restHistoryBatch: Message[] = [
      {
        id: 'srv_older_msg',
        conversationId,
        senderId: otherUserId,
        content: 'Older message',
        type: 'text',
        createdAt: '2026-10-27T11:59:50Z',
        readBy: [],
        sequence: 49,
      },
      {
        id: 'srv_race_msg', // Duplicate from history
        conversationId,
        senderId: otherUserId,
        content: 'Fast socket message',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 50,
      },
    ];
    mergeHistoryInCache(queryClient, conversationId, restHistoryBatch);

    const finalMessages = queryClient.getQueryData<Message[]>(queryKey) || [];
    // Must contain exactly 2 messages in sequence order 49, 50 without duplicates
    expect(finalMessages.length).toBe(2);
    expect(finalMessages[0].sequence).toBe(49);
    expect(finalMessages[1].sequence).toBe(50);
  });

  it('purges all cached messages and isolates user state upon account logout', () => {
    const queryKey = ['messages', conversationId];

    queryClient.setQueryData<Message[]>(queryKey, [
      {
        id: 'msg-user-1',
        conversationId,
        senderId: myUserId,
        content: 'Confidential message',
        type: 'text',
        createdAt: '2026-10-27T12:00:00Z',
        readBy: [],
        sequence: 1,
      },
    ]);

    expect(queryClient.getQueryData(queryKey)).toBeDefined();

    // User logs out -> queryClient.clear()
    queryClient.clear();

    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
  });

  it('handles ephemeral typing broadcast and auto-expiry after 5 seconds', () => {
    vi.useFakeTimers();
    let isTyping = false;
    let typingUser: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleTyping = (payload: { is_typing: boolean; username: string }) => {
      if (payload.is_typing) {
        isTyping = true;
        typingUser = payload.username;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          isTyping = false;
          typingUser = null;
        }, 5000);
      } else {
        isTyping = false;
        typingUser = null;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    };

    // User starts typing
    handleTyping({ is_typing: true, username: 'bob' });
    expect(isTyping).toBe(true);
    expect(typingUser).toBe('bob');

    // 5 seconds elapse without refresh -> expires automatically
    vi.advanceTimersByTime(5000);
    expect(isTyping).toBe(false);
    expect(typingUser).toBeNull();

    // User types and then stops explicitly
    handleTyping({ is_typing: true, username: 'bob' });
    expect(isTyping).toBe(true);
    handleTyping({ is_typing: false, username: 'bob' });
    expect(isTyping).toBe(false);
    expect(typingUser).toBeNull();

    vi.useRealTimers();
  });
});
