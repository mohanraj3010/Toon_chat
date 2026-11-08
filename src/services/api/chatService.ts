import { apiClient } from './httpClient';
import type { Message } from '@/shared/types';
import {
  ConversationMessagesResponseSchema,
  mapHistoryItemToDomain,
  type ConversationMessagesResponseDto,
} from '@/services/realtime/dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FetchMessagesOptions {
  limit?: number;
  before_seq?: number;
  after_seq?: number;
}

export interface ConversationHistoryResult {
  messages: Message[];
  hasMore: boolean;
  oldestSeq: number | null;
  latestSeq: number | null;
  count: number;
}

/**
 * Authoritative REST history service for conversation timeline loading and catch-up recovery.
 * Features:
 *  - Queries GET /api/v1/conversations/{conversation_id}/messages.
 *  - Enforces runtime Zod validation of inbound response payloads.
 *  - Translates wire DTOs into frontend domain models.
 */
export const persistentChatService = {
  async getMessages(
    conversationId: string,
    options: FetchMessagesOptions = {},
    currentUserId?: string
  ): Promise<ConversationHistoryResult> {
    // 1. Guard against non-UUID identifiers
    if (!UUID_REGEX.test(conversationId)) {
      return {
        messages: [],
        hasMore: false,
        oldestSeq: null,
        latestSeq: null,
        count: 0,
      };
    }

    // 2. Query authoritative REST endpoint
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.before_seq !== undefined) params.set('before_seq', String(options.before_seq));
    if (options.after_seq !== undefined) params.set('after_seq', String(options.after_seq));

    const queryString = params.toString();
    const endpoint = `/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;

    try {
      const rawData = await apiClient.get<unknown>(endpoint);
      const parsed = ConversationMessagesResponseSchema.safeParse(rawData);

      if (!parsed.success) {
        throw new Error('Invalid conversation history response format');
      }

      const dto: ConversationMessagesResponseDto = parsed.data;
      const domainMessages: Message[] = dto.messages.map((item) =>
        mapHistoryItemToDomain(item, currentUserId)
      );

      return {
        messages: domainMessages,
        hasMore: dto.has_more,
        oldestSeq: dto.oldest_seq ?? null,
        latestSeq: dto.latest_seq ?? null,
        count: dto.count,
      };
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        return {
          messages: [],
          hasMore: false,
          oldestSeq: null,
          latestSeq: null,
          count: 0,
        };
      }
      throw err;
    }
  },

  /**
   * Dispatches a message to the backend via authoritative REST endpoint.
   * Guarantees message persistence and returns sequence-allocated ACK.
   */
  async sendMessage(
    conversationId: string,
    payload: {
      content: string;
      client_message_id?: string;
      client_msg_id?: string;
      type?: string;
      media_id?: string | null;
      media_url?: string | null;
      reply_to_id?: string | null;
    }
  ): Promise<{
    client_message_id: string;
    client_msg_id?: string;
    message_id: string;
    conversation_id: string;
    sequence: number;
    created_at: string;
    status: 'sent';
  }> {
    const effectiveClientId = payload.client_message_id || payload.client_msg_id || '';
    return apiClient.post(
      `/conversations/${conversationId}/messages`,
      {
        body: payload.content,
        content: payload.content,
        client_message_id: effectiveClientId,
        client_msg_id: effectiveClientId,
        type: payload.type || 'text',
        media_id: payload.media_id || null,
        media_url: payload.media_url || null,
        reply_to_id: payload.reply_to_id || null,
      },
      { requiresAuth: true }
    );
  },
};
