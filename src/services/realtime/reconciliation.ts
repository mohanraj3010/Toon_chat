import type { QueryClient } from '@tanstack/react-query';
import type { Conversation, Message } from '@/shared/types';
import {
  mapWireMessageToDomain,
  type ChatAckPayload,
  type ChatDeliveredBroadcastPayload,
  type ChatMessagePayload,
  type ChatReadBroadcastPayload,
} from './dto';

/**
 * Deduplicates and sorts messages deterministically:
 * 1. Monotonic server sequences (sequence ASC) come first.
 * 2. Optimistic messages without an allocated sequence (status === 'sending')
 *    are sorted at the tail ordered by createdAt.
 * 3. Exact server ID and clientMessageId clashes are unified.
 */
export function sortAndDeduplicateMessages(messages: Message[]): Message[] {
  const seenIds = new Set<string>();
  const seenClientMsgIds = new Set<string>();
  const result: Message[] = [];

  // Iterate backwards to prefer newer/authoritative updates if duplicate exists
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (seenIds.has(msg.id)) continue;
    if (msg.clientMessageId && seenClientMsgIds.has(msg.clientMessageId)) continue;

    seenIds.add(msg.id);
    if (msg.clientMessageId) {
      seenClientMsgIds.add(msg.clientMessageId);
    }
    result.push(msg);
  }

  result.reverse();

  return result.sort((a, b) => {
    // Both have server sequence: sort by sequence ASC
    if (a.sequence !== undefined && b.sequence !== undefined) {
      return a.sequence - b.sequence;
    }
    // Sequenced messages always precede unsequenced/pending messages
    if (a.sequence !== undefined && b.sequence === undefined) {
      return -1;
    }
    if (a.sequence === undefined && b.sequence !== undefined) {
      return 1;
    }
    // Neither has sequence (both optimistic pending): sort by createdAt
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Reconciles incoming `chat.ack` with an optimistic pending message in TanStack Query cache.
 */
export function reconcileAckInCache(
  queryClient: QueryClient,
  ack: ChatAckPayload
): void {
  const queryKey = ['messages', ack.conversation_id];

  queryClient.setQueryData<Message[]>(queryKey, (oldMessages = []) => {
    let matched = false;

    const updated = oldMessages.map((m) => {
      const isMatch =
        m.clientMessageId === ack.client_message_id ||
        m.id === ack.client_message_id;

      if (!isMatch) return m;

      matched = true;
      const newStatus: Message['status'] =
        m.status === 'read' ? 'read' : m.status === 'delivered' ? 'delivered' : 'sent';

      return {
        ...m,
        id: ack.message_id,
        sequence: ack.sequence,
        createdAt: ack.created_at,
        status: newStatus,
      };
    });

    if (!matched) {
      // Message was not present in cache; nothing to update
      return oldMessages;
    }

    return sortAndDeduplicateMessages(updated);
  });
}

/**
 * Reconciles incoming committed `chat.message` broadcast into TanStack Query cache.
 */
export function reconcileMessageInCache(
  queryClient: QueryClient,
  wireMessage: ChatMessagePayload,
  currentUserId?: string
): Message {
  const queryKey = ['messages', wireMessage.conversation_id];
  const domainMessage = mapWireMessageToDomain(wireMessage, currentUserId);

  queryClient.setQueryData<Message[]>(queryKey, (oldMessages = []) => {
    let replaced = false;

    const updated = oldMessages.map((m) => {
      const isIdMatch = m.id === wireMessage.id;
      const isClientMsgMatch =
        Boolean(wireMessage.client_message_id) &&
        (m.clientMessageId === wireMessage.client_message_id ||
          m.id === wireMessage.client_message_id);

      if (isIdMatch || isClientMsgMatch) {
        replaced = true;
        return {
          ...domainMessage,
          // Preserve read/delivered status if already acknowledged
          status:
            m.status === 'read'
              ? 'read'
              : m.status === 'delivered'
              ? 'delivered'
              : domainMessage.status || 'sent',
          reactions: m.reactions && m.reactions.length > 0 ? m.reactions : domainMessage.reactions,
        };
      }
      return m;
    });

    if (!replaced) {
      updated.push(domainMessage);
    }

    return sortAndDeduplicateMessages(updated);
  });

  return domainMessage;
}

/**
 * Reconciles incoming `chat.read` broadcast:
 * Advances recipient's last_read_seq and transitions matching sent messages to 'read'.
 */
export function reconcileReadInCache(
  queryClient: QueryClient,
  read: ChatReadBroadcastPayload,
  currentUserId?: string
): void {
  const queryKey = ['messages', read.conversation_id];

  queryClient.setQueryData<Message[]>(queryKey, (oldMessages = []) => {
    if (!oldMessages.length) return oldMessages;

    // Only update my sent messages if another user read them
    const isOtherReader = !currentUserId || read.user_id !== currentUserId;
    if (!isOtherReader) return oldMessages;

    return oldMessages.map((m) => {
      const isMyMessage = currentUserId ? m.senderId === currentUserId : true;
      const isPastOrAtSeq = m.sequence !== undefined && m.sequence <= read.last_read_seq;

      if (isMyMessage && isPastOrAtSeq && m.status !== 'read') {
        const readBy = m.readBy.includes(read.user_id) ? m.readBy : [...m.readBy, read.user_id];
        return {
          ...m,
          status: 'read',
          readBy,
        };
      }
      return m;
    });
  });
}

/**
 * Reconciles incoming `chat.delivered` broadcast:
 * Updates delivery tick status for matching messages sent by current user.
 */
export function reconcileDeliveredInCache(
  queryClient: QueryClient,
  deliv: ChatDeliveredBroadcastPayload,
  currentUserId?: string
): void {
  const queryKey = ['messages', deliv.conversation_id];

  queryClient.setQueryData<Message[]>(queryKey, (oldMessages = []) => {
    if (!oldMessages.length) return oldMessages;

    // Only update my sent messages if another recipient device confirmed delivery
    const isOtherRecipient = !currentUserId || deliv.user_id !== currentUserId;
    if (!isOtherRecipient) return oldMessages;

    return oldMessages.map((m) => {
      const isMyMessage = currentUserId ? m.senderId === currentUserId : true;
      const isTarget =
        m.id === deliv.message_id ||
        (m.sequence !== undefined && m.sequence <= deliv.sequence);

      // Do not downgrade 'read' messages
      if (isMyMessage && isTarget && m.status !== 'read' && m.status !== 'delivered') {
        return {
          ...m,
          status: 'delivered',
        };
      }
      return m;
    });
  });
}

/**
 * Merges a batch of historical or catch-up messages into TanStack Query cache.
 */
export function mergeHistoryInCache(
  queryClient: QueryClient,
  conversationId: string,
  newMessages: Message[]
): void {
  const queryKey = ['messages', conversationId];

  queryClient.setQueryData<Message[]>(queryKey, (oldMessages = []) => {
    const combined = [...oldMessages, ...newMessages];
    return sortAndDeduplicateMessages(combined);
  });
}

/**
 * Updates conversation preview and unread count in the 'conversations' query cache
 * if conversations exist in cache.
 */
export function updateConversationPreviewInCache<T extends Conversation = Conversation>(
  queryClient: QueryClient,
  conversationId: string,
  lastMessage: Message,
  incrementUnread = false
): void {
  queryClient.setQueryData<T[]>(['conversations'], (oldChats) => {
    if (!oldChats) return oldChats;
    return oldChats.map((c) => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage,
          updatedAt: lastMessage.createdAt,
          unreadCount: incrementUnread ? (c.unreadCount || 0) + 1 : c.unreadCount || 0,
        };
      }
      return c;
    });
  });
}

/**
 * Resets unread counter for a specific conversation in 'conversations' cache.
 */
export function clearConversationUnreadInCache<T extends Conversation = Conversation>(
  queryClient: QueryClient,
  conversationId: string
): void {
  queryClient.setQueryData<T[]>(['conversations'], (oldChats) => {
    if (!oldChats) return oldChats;
    return oldChats.map((c) => {
      if (c.id === conversationId && (c.unreadCount || 0) > 0) {
        return {
          ...c,
          unreadCount: 0,
        };
      }
      return c;
    });
  });
}
