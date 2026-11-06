import { describe, it, expect } from 'vitest';
import {
  parseInboundFrame,
  mapWireMessageToDomain,
  mapHistoryItemToDomain,
  RealtimeTicketResponseSchema,
  ConversationMessagesResponseSchema,
  type ChatMessagePayload,
  type MessageHistoryItemDto,
} from '../dto';

describe('Realtime DTO & Runtime Validation', () => {
  it('validates and parses a valid connection.ready frame', () => {
    const raw = JSON.stringify({
      type: 'connection.ready',
      id: 'frame-1',
      ts: '2026-10-27T12:00:00.000Z',
      payload: {
        user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        session_id: 'sess-abc123',
        heartbeat_interval_sec: 30,
      },
    });

    const parsed = parseInboundFrame(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('connection.ready');
    if (parsed && parsed.type === 'connection.ready') {
      expect(parsed.payload.user_id).toBe('c1f7f0aa-b54c-47ea-bd56-621aa906e001');
      expect(parsed.payload.session_id).toBe('sess-abc123');
      expect(parsed.payload.heartbeat_interval_sec).toBe(30);
    }
  });

  it('validates and parses a valid chat.ack frame', () => {
    const raw = JSON.stringify({
      type: 'chat.ack',
      id: 'ack-frame-1',
      ts: '2026-10-27T12:00:01.000Z',
      payload: {
        client_message_id: 'cmsg_123',
        message_id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
        conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
        sequence: 42,
        created_at: '2026-10-27T12:00:01.000Z',
        status: 'sent',
      },
    });

    const parsed = parseInboundFrame(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('chat.ack');
    if (parsed && parsed.type === 'chat.ack') {
      expect(parsed.payload.sequence).toBe(42);
      expect(parsed.payload.client_message_id).toBe('cmsg_123');
    }
  });

  it('validates and parses a valid chat.message frame with sender summary', () => {
    const raw = JSON.stringify({
      type: 'chat.message',
      id: 'msg-frame-1',
      ts: '2026-10-27T12:00:02.000Z',
      payload: {
        id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
        conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
        sender_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        sequence: 42,
        client_message_id: 'cmsg_123',
        type: 'text',
        body: 'Skating in Maple Park! 🛹',
        media_id: null,
        media_url: null,
        reply_to_id: null,
        created_at: '2026-10-27T12:00:02.000Z',
        sender: {
          id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
          username: 'luna',
          display_name: 'Luna',
          avatar_url: '/avatars/luna.svg',
        },
      },
    });

    const parsed = parseInboundFrame(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('chat.message');
    if (parsed && parsed.type === 'chat.message') {
      expect(parsed.payload.body).toBe('Skating in Maple Park! 🛹');
      expect(parsed.payload.sender.display_name).toBe('Luna');
    }
  });

  it('validates read and delivered receipts', () => {
    const readRaw = JSON.stringify({
      type: 'chat.read',
      id: 'read-frame-1',
      ts: '2026-10-27T12:00:03.000Z',
      payload: {
        conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
        user_id: 'b2c8a190-3069-4ce3-a006-118fa906e002',
        last_read_seq: 42,
        read_at: '2026-10-27T12:00:03.000Z',
      },
    });
    const parsedRead = parseInboundFrame(readRaw);
    expect(parsedRead?.type).toBe('chat.read');

    const delivRaw = JSON.stringify({
      type: 'chat.delivered',
      id: 'deliv-frame-1',
      ts: '2026-10-27T12:00:04.000Z',
      payload: {
        conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
        message_id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
        sequence: 42,
        user_id: 'b2c8a190-3069-4ce3-a006-118fa906e002',
        delivered_at: '2026-10-27T12:00:04.000Z',
      },
    });
    const parsedDeliv = parseInboundFrame(delivRaw);
    expect(parsedDeliv?.type).toBe('chat.delivered');
  });

  it('rejects malformed envelopes and schemas', () => {
    // Malformed JSON
    expect(parseInboundFrame('not json')).toBeNull();

    // Missing required fields
    expect(parseInboundFrame('{}')).toBeNull();

    // Invalid payload schema (e.g. sequence is a string or negative)
    const invalidAck = JSON.stringify({
      type: 'chat.ack',
      id: 'ack-1',
      ts: '2026-10-27T12:00:00Z',
      payload: {
        sequence: -5, // Invalid: must be positive
      },
    });
    expect(parseInboundFrame(invalidAck)).toBeNull();
  });

  it('handles unknown event types safely', () => {
    const raw = JSON.stringify({
      type: 'custom.experimental_event',
      id: 'f-1',
      ts: '2026-10-27T12:00:00Z',
      payload: { foo: 'bar' },
    });
    const parsed = parseInboundFrame(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('unknown');
  });

  it('validates RealtimeTicketResponse schema', () => {
    const validTicket = {
      ticket: 'tkt_8f93a102b4894ceea981f47b2c0199e8',
      expires_in: 60,
      user_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
    };
    expect(RealtimeTicketResponseSchema.safeParse(validTicket).success).toBe(true);

    const invalidTicket = { ticket: '', expires_in: -1 };
    expect(RealtimeTicketResponseSchema.safeParse(invalidTicket).success).toBe(false);
  });

  it('validates ConversationMessagesResponse schema', () => {
    const validHistory = {
      conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
      messages: [
        {
          id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
          conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
          sequence: 1,
          sender_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
          client_message_id: 'cmsg_1',
          type: 'text',
          body: 'Hello!',
          created_at: '2026-10-27T12:00:00Z',
          is_edited: false,
          sender: {
            id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
            username: 'luna',
            display_name: 'Luna',
          },
        },
      ],
      has_more: false,
      oldest_seq: 1,
      latest_seq: 1,
      count: 1,
    };
    expect(ConversationMessagesResponseSchema.safeParse(validHistory).success).toBe(true);
  });

  it('maps ChatMessagePayload to frontend domain Message correctly', () => {
    const payload: ChatMessagePayload = {
      id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
      conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
      sender_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
      sequence: 10,
      client_message_id: 'cmsg_99',
      type: 'text',
      body: 'Mapped content',
      media_id: null,
      media_url: null,
      reply_to_id: null,
      created_at: '2026-10-27T12:00:00Z',
      sender: {
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        username: 'luna',
        display_name: 'Luna Toon',
        avatar_url: '/luna.png',
      },
    };

    // When sender is me
    const myDomainMsg = mapWireMessageToDomain(payload, 'c1f7f0aa-b54c-47ea-bd56-621aa906e001');
    expect(myDomainMsg.content).toBe('Mapped content');
    expect(myDomainMsg.conversationId).toBe('8fa8d7a1-3069-4ce3-a006-259fc6c52a32');
    expect(myDomainMsg.senderId).toBe('c1f7f0aa-b54c-47ea-bd56-621aa906e001');
    expect(myDomainMsg.sequence).toBe(10);
    expect(myDomainMsg.clientMessageId).toBe('cmsg_99');
    expect(myDomainMsg.status).toBe('sent');
    expect(myDomainMsg.sender?.displayName).toBe('Luna Toon');

    // When sender is someone else
    const otherDomainMsg = mapWireMessageToDomain(payload, 'other-user-uuid');
    expect(otherDomainMsg.status).toBeUndefined();
  });

  it('maps MessageHistoryItemDto to frontend domain Message correctly', () => {
    const historyItem: MessageHistoryItemDto = {
      id: 'd1e7f0aa-b54c-47ea-bd56-621aa906e099',
      conversation_id: '8fa8d7a1-3069-4ce3-a006-259fc6c52a32',
      sequence: 5,
      sender_id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
      client_message_id: 'cmsg_5',
      type: 'sticker',
      body: 'sticker-1',
      media_id: null,
      media_url: null,
      reply_to_id: null,
      is_edited: false,
      created_at: '2026-10-27T12:00:00Z',
      sender: {
        id: 'c1f7f0aa-b54c-47ea-bd56-621aa906e001',
        username: 'luna',
        display_name: 'Luna',
        avatar_url: null,
      },
    };

    const domainMsg = mapHistoryItemToDomain(historyItem, 'c1f7f0aa-b54c-47ea-bd56-621aa906e001');
    expect(domainMsg.type).toBe('sticker');
    expect(domainMsg.content).toBe('sticker-1');
    expect(domainMsg.sequence).toBe(5);
  });
});
