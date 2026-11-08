import { z } from 'zod';
import type { Message } from '@/shared/types';

// ==========================================
// 1. INBOUND WIRE SCHEMAS & DTOS
// ==========================================

export const RealtimeTicketResponseSchema = z.object({
  ticket: z.string().min(1),
  expires_in: z.number().int().positive(),
  user_id: z.string().uuid(),
});
export type RealtimeTicketResponseDto = z.infer<typeof RealtimeTicketResponseSchema>;

export const ConnectionReadyPayloadSchema = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().min(1),
  heartbeat_interval_sec: z.number().int().positive().default(30),
});
export type ConnectionReadyPayload = z.infer<typeof ConnectionReadyPayloadSchema>;

export const PongPayloadSchema = z.object({
  echo_id: z.string(),
});
export type PongPayload = z.infer<typeof PongPayloadSchema>;

export const SenderSummarySchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullable().optional(),
});
export type SenderSummaryDto = z.infer<typeof SenderSummarySchema>;

export const ChatAckPayloadSchema = z
  .object({
    client_message_id: z.string().optional(),
    client_msg_id: z.string().optional(),
    message_id: z.string().min(1),
    conversation_id: z.string().min(1),
    sequence: z.number().int().nonnegative().optional().default(1),
    created_at: z.string().optional(),
    status: z.string().optional().default('sent'),
  })
  .transform((data) => {
    const clientId = data.client_message_id || data.client_msg_id || '';
    return {
      client_message_id: clientId,
      client_msg_id: clientId,
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      sequence: data.sequence ?? 1,
      created_at: data.created_at || new Date().toISOString(),
      status: 'sent' as const,
    };
  });
export type ChatAckPayload = z.infer<typeof ChatAckPayloadSchema>;

export const ChatMessagePayloadSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  sequence: z.number().int().positive(),
  client_message_id: z.string().min(1),
  type: z.enum(['text', 'image', 'sticker', 'voice', 'file']).catch('text'),
  body: z.string(),
  media_id: z.string().uuid().nullable().optional(),
  media_url: z.string().nullable().optional(),
  reply_to_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  sender: SenderSummarySchema,
});
export type ChatMessagePayload = z.infer<typeof ChatMessagePayloadSchema>;

export const ChatReadBroadcastPayloadSchema = z.object({
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  last_read_seq: z.number().int().positive(),
  read_at: z.string(),
});
export type ChatReadBroadcastPayload = z.infer<typeof ChatReadBroadcastPayloadSchema>;

export const ChatDeliveredBroadcastPayloadSchema = z.object({
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid(),
  sequence: z.number().int().positive(),
  user_id: z.string().uuid(),
  delivered_at: z.string(),
});
export type ChatDeliveredBroadcastPayload = z.infer<typeof ChatDeliveredBroadcastPayloadSchema>;

export const ChatTypingBroadcastPayloadSchema = z.object({
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  username: z.string(),
  display_name: z.string(),
  is_typing: z.boolean(),
  expires_at: z.string().nullable().optional(),
});
export type ChatTypingBroadcastPayload = z.infer<typeof ChatTypingBroadcastPayloadSchema>;

export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional().default({}),
  echo_id: z.string().nullable().optional(),
});
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

// Generic wire envelope
export const WireEnvelopeSchema = z.object({
  type: z.string().min(1),
  id: z.string().min(1),
  ts: z.string(),
  payload: z.unknown(),
});
export type WireEnvelope = z.infer<typeof WireEnvelopeSchema>;

// Discriminated / Typed Inbound Frames
export type InboundFrame =
  | { type: 'connection.ready'; id: string; ts: string; payload: ConnectionReadyPayload }
  | { type: 'server.pong'; id: string; ts: string; payload: PongPayload }
  | { type: 'chat.ack'; id: string; ts: string; payload: ChatAckPayload }
  | { type: 'chat.message'; id: string; ts: string; payload: ChatMessagePayload }
  | { type: 'chat.read'; id: string; ts: string; payload: ChatReadBroadcastPayload }
  | { type: 'chat.delivered'; id: string; ts: string; payload: ChatDeliveredBroadcastPayload }
  | { type: 'chat.typing'; id: string; ts: string; payload: ChatTypingBroadcastPayload }
  | { type: 'error'; id: string; ts: string; payload: ErrorPayload }
  | { type: 'unknown'; id: string; ts: string; rawType: string; payload: unknown };

// ==========================================
// 2. REST HISTORY SCHEMAS & DTOS
// ==========================================

export const MessageHistoryItemSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sequence: z.number().int().positive(),
  sender_id: z.string().uuid().nullable().optional(),
  client_message_id: z.string(),
  type: z.enum(['text', 'image', 'sticker', 'voice', 'file']).catch('text'),
  body: z.string(),
  media_id: z.string().uuid().nullable().optional(),
  media_url: z.string().nullable().optional(),
  reply_to_id: z.string().uuid().nullable().optional(),
  is_edited: z.boolean().default(false),
  created_at: z.string(),
  sender: SenderSummarySchema.nullable().optional(),
});
export type MessageHistoryItemDto = z.infer<typeof MessageHistoryItemSchema>;

export const ConversationMessagesResponseSchema = z.object({
  conversation_id: z.string().uuid(),
  messages: z.array(MessageHistoryItemSchema),
  has_more: z.boolean(),
  oldest_seq: z.number().int().nullable().optional(),
  latest_seq: z.number().int().nullable().optional(),
  count: z.number().int(),
});
export type ConversationMessagesResponseDto = z.infer<typeof ConversationMessagesResponseSchema>;

// ==========================================
// 3. OUTBOUND PAYLOAD DEFINITIONS
// ==========================================

export interface ChatSendWirePayload {
  conversation_id: string;
  client_message_id: string;
  type: 'text' | 'image' | 'sticker' | 'voice' | 'file';
  body: string;
  media_id: string | null;
  media_url: string | null;
  reply_to_id: string | null;
}

export interface ChatReadWirePayload {
  conversation_id: string;
  sequence: number;
}

export interface ChatTypingWirePayload {
  conversation_id: string;
  is_typing: boolean;
}

export interface ChatDeliveredWirePayload {
  conversation_id: string;
  message_id: string;
  sequence: number;
}

// Outbound Envelope Builder
export interface OutboundEnvelope<T = unknown> {
  type: string;
  id: string;
  ts: string;
  payload: T;
}

// ==========================================
// 4. RUNTIME FRAME PARSER & VALIDATOR
// ==========================================

export function parseInboundFrame(rawText: string): InboundFrame | null {
  try {
    const rawJson = JSON.parse(rawText);
    const envResult = WireEnvelopeSchema.safeParse(rawJson);
    if (!envResult.success) {
      return null;
    }

    const { type, id, ts, payload } = envResult.data;

    switch (type) {
      case 'connection.ready': {
        const p = ConnectionReadyPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'server.pong': {
        const p = PongPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'chat.ack': {
        const p = ChatAckPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'chat.message': {
        const p = ChatMessagePayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'chat.read': {
        const p = ChatReadBroadcastPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'chat.delivered': {
        const p = ChatDeliveredBroadcastPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'chat.typing': {
        const p = ChatTypingBroadcastPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      case 'error': {
        const p = ErrorPayloadSchema.safeParse(payload);
        return p.success ? { type, id, ts, payload: p.data } : null;
      }
      default:
        return { type: 'unknown', id, ts, rawType: type, payload };
    }
  } catch {
    return null;
  }
}

// ==========================================
// 5. DOMAIN MAPPING FUNCTIONS
// ==========================================

export function mapWireMessageToDomain(dto: ChatMessagePayload, currentUserId?: string): Message {
  const isMine = currentUserId ? dto.sender_id === currentUserId : false;

  return {
    id: dto.id,
    conversationId: dto.conversation_id,
    senderId: dto.sender_id,
    content: dto.body,
    type: dto.type,
    mediaId: dto.media_id ?? undefined,
    mediaUrl: dto.media_url ?? undefined,
    createdAt: dto.created_at,
    readBy: [],
    status: isMine ? 'sent' : undefined,
    replyToId: dto.reply_to_id ?? undefined,
    reactions: [],
    sequence: dto.sequence,
    clientMessageId: dto.client_message_id,
    sender: dto.sender
      ? {
          id: dto.sender.id,
          username: dto.sender.username,
          displayName: dto.sender.display_name,
          avatarUrl: dto.sender.avatar_url,
        }
      : undefined,
  };
}

export function mapHistoryItemToDomain(dto: MessageHistoryItemDto, currentUserId?: string): Message {
  const senderId = dto.sender_id || (dto.sender ? dto.sender.id : 'unknown');
  const isMine = currentUserId ? senderId === currentUserId : false;

  return {
    id: dto.id,
    conversationId: dto.conversation_id,
    senderId,
    content: dto.body,
    type: dto.type,
    mediaId: dto.media_id ?? undefined,
    mediaUrl: dto.media_url ?? undefined,
    createdAt: dto.created_at,
    readBy: [],
    status: isMine ? 'sent' : undefined,
    replyToId: dto.reply_to_id ?? undefined,
    reactions: [],
    sequence: dto.sequence,
    clientMessageId: dto.client_message_id,
    sender: dto.sender
      ? {
          id: dto.sender.id,
          username: dto.sender.username,
          displayName: dto.sender.display_name,
          avatarUrl: dto.sender.avatar_url,
        }
      : undefined,
  };
}
