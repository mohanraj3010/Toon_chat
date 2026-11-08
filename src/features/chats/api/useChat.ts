import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/useAuth';
import type { Message } from '@/shared/types';
import { persistentChatService } from '@/services/api/chatService';
import { mediaService, type VoiceUploadMetadata } from '@/services/api/mediaService';
import type { VoiceMetadata } from '../components/VoiceRecorderBar';
import {
  realtimeService,
  reconcileAckInCache,
  reconcileMessageInCache,
  reconcileReadInCache,
  reconcileDeliveredInCache,
  mergeHistoryInCache,
  updateConversationPreviewInCache,
  clearConversationUnreadInCache,
  sortAndDeduplicateMessages,
  type RealtimeConnectionStatus,
  type ChatMessagePayload,
  type ChatAckPayload,
  type ChatReadBroadcastPayload,
  type ChatDeliveredBroadcastPayload,
  type ChatTypingBroadcastPayload,
} from '@/services/realtime';

function generateClientMessageId(): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `cmsg_${Date.now()}_${rand}`;
}

export const useChat = (conversationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id || '00000000-0000-0000-0000-000000000000';

  const queryKey = useMemo(() => ['messages', conversationId], [conversationId]);

  // Connection and typing state
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>(
    realtimeService.getStatus()
  );
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination state
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const oldestKnownSeqRef = useRef<number | null>(null);

  // Read receipt tracking to prevent redundant emissions
  const lastReadSeqEmittedRef = useRef<number>(0);
  // Delivery receipt tracking to prevent duplicate ACKs
  const deliveredMessageIdsRef = useRef<Set<string>>(new Set());

  // Typing throttle ref
  const lastTypingEmittedRef = useRef<number>(0);

  // In-flight / failed voice note buffer for retrying upload or send
  const voiceRetryMap = useRef<Map<string, { blob: Blob; meta: VoiceMetadata }>>(new Map());

  // 1. Initial messages query from authoritative REST endpoint (or mock fallback)
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey,
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await persistentChatService.getMessages(
        conversationId,
        { limit: 50 },
        currentUserId
      );
      setHasMoreOlder(res.hasMore);
      oldestKnownSeqRef.current = res.oldestSeq;
      return sortAndDeduplicateMessages(res.messages);
    },
    enabled: Boolean(conversationId),
  });

  // 2. Ensure RealtimeService connects when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const currentStatus = realtimeService.getStatus();
      if (currentStatus === 'offline') {
        realtimeService.connect();
      }
    }
  }, [isAuthenticated]);

  // 3. Emit read receipt when conversation is focused and visible
  const maybeEmitReadReceipt = useCallback(
    (targetSeq: number) => {
      if (!conversationId || targetSeq <= 0) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (targetSeq <= lastReadSeqEmittedRef.current) {
        return;
      }

      lastReadSeqEmittedRef.current = targetSeq;
      clearConversationUnreadInCache(queryClient, conversationId);
      realtimeService.sendReadReceipt({
        conversation_id: conversationId,
        sequence: targetSeq,
      });
    },
    [conversationId, queryClient]
  );

  // 4. Catch-up recovery on reconnect
  const handleCatchUpOnReconnect = useCallback(async () => {
    if (!conversationId) return;

    let highestSeq = 0;
    const currentList = queryClient.getQueryData<Message[]>(queryKey) || [];
    for (const m of currentList) {
      if (m.sequence !== undefined && m.sequence > highestSeq) {
        highestSeq = m.sequence;
      }
    }

    if (highestSeq > 0) {
      try {
        const catchUpRes = await persistentChatService.getMessages(
          conversationId,
          { after_seq: highestSeq, limit: 100 },
          currentUserId
        );
        if (catchUpRes.messages.length > 0) {
          mergeHistoryInCache(queryClient, conversationId, catchUpRes.messages);
        }
      } catch (err) {
        console.warn('Catch-up recovery failed:', err);
      }
    }
  }, [conversationId, currentUserId, queryClient, queryKey]);

  // 5. Typing indicator emission with throttle (declared before sendMessage)
  const sendTyping = useCallback(
    (typingState: boolean) => {
      if (!conversationId) return;

      const now = Date.now();
      if (typingState) {
        // Throttle typing events: max once per 2 seconds
        if (now - lastTypingEmittedRef.current < 2000) {
          return;
        }
        lastTypingEmittedRef.current = now;
      }

      realtimeService.sendTyping({
        conversation_id: conversationId,
        is_typing: typingState,
      });
    },
    [conversationId]
  );

  // 6. Realtime event listeners for this conversation
  useEffect(() => {
    if (!conversationId) return;

    // Reset conversation-scoped tracking refs
    lastReadSeqEmittedRef.current = 0;
    deliveredMessageIdsRef.current.clear();

    // Subscribe to status changes
    const unsubStatus = realtimeService.on('status', (newStatus) => {
      setConnectionStatus(newStatus);
      if (newStatus === 'connected') {
        handleCatchUpOnReconnect();
      }
    });

    // Subscribe to ACK
    const unsubAck = realtimeService.on('chat.ack', (ack: ChatAckPayload) => {
      if (ack.conversation_id === conversationId) {
        reconcileAckInCache(queryClient, ack);
      }
    });

    // Subscribe to incoming committed messages
    const unsubMessage = realtimeService.on('chat.message', (wireMsg: ChatMessagePayload) => {
      if (wireMsg.conversation_id !== conversationId) return;

      const domainMsg = reconcileMessageInCache(queryClient, wireMsg, currentUserId);
      const isForeground = typeof document !== 'undefined' && document.visibilityState === 'visible';
      updateConversationPreviewInCache(
        queryClient,
        conversationId,
        domainMsg,
        wireMsg.sender_id !== currentUserId && !isForeground,
        currentUserId
      );

      // If message is from another participant, emit delivery receipt ACK
      if (wireMsg.sender_id !== currentUserId) {
        if (!deliveredMessageIdsRef.current.has(wireMsg.id)) {
          deliveredMessageIdsRef.current.add(wireMsg.id);
          realtimeService.sendDeliveryReceipt({
            conversation_id: conversationId,
            message_id: wireMsg.id,
            sequence: wireMsg.sequence,
          });
        }

        // If conversation is currently active and focused in foreground, mark read
        if (isForeground) {
          maybeEmitReadReceipt(wireMsg.sequence);
        }
      }
    });

    // Subscribe to read receipts
    const unsubRead = realtimeService.on('chat.read', (read: ChatReadBroadcastPayload) => {
      if (read.conversation_id === conversationId) {
        reconcileReadInCache(queryClient, read, currentUserId);
      }
    });

    // Subscribe to delivery receipts
    const unsubDeliv = realtimeService.on('chat.delivered', (deliv: ChatDeliveredBroadcastPayload) => {
      if (deliv.conversation_id === conversationId) {
        reconcileDeliveredInCache(queryClient, deliv, currentUserId);
      }
    });

    // Subscribe to typing indicator
    const unsubTyping = realtimeService.on('chat.typing', (payload: ChatTypingBroadcastPayload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.user_id === currentUserId) return; // Don't show my own typing

      if (payload.is_typing) {
        setIsTyping(true);
        setTypingUser(payload.display_name || payload.username);

        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
        }
        // Auto-expire after 5 seconds if no refresh event arrives
        typingTimerRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingUser(null);
          typingTimerRef.current = null;
        }, 5000);
      } else {
        setIsTyping(false);
        setTypingUser(null);
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      }
    });

    // Subscribe to realtime error frames (e.g. payload validation errors)
    const unsubError = realtimeService.on('error', (err) => {
      console.warn('[useChat] WebSocket error frame received:', err);
      queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.status === 'sending' && (err.echo_id ? m.clientMessageId === err.echo_id || m.id === err.echo_id : true)
            ? { ...m, status: 'failed' }
            : m
        )
      );
    });

    return () => {
      unsubStatus();
      unsubAck();
      unsubMessage();
      unsubRead();
      unsubDeliv();
      unsubTyping();
      unsubError();

      setIsTyping(false);
      setTypingUser(null);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [conversationId, currentUserId, queryClient, handleCatchUpOnReconnect, maybeEmitReadReceipt, queryKey]);

  // 7. Emit read receipt for existing messages when loaded/received
  useEffect(() => {
    let maxIncomingSeq = 0;
    for (const m of messages) {
      if (m.senderId !== currentUserId && m.sequence !== undefined && m.sequence > maxIncomingSeq) {
        maxIncomingSeq = m.sequence;
      }
    }
    if (maxIncomingSeq > 0) {
      maybeEmitReadReceipt(maxIncomingSeq);
    }
  }, [messages, currentUserId, maybeEmitReadReceipt]);

  // 8. Send message mutation with optimistic reconciliation
  const sendMessage = useCallback(
    (
      content: string,
      type: Message['type'] = 'text',
      replyToId?: string,
      mediaInfo?: {
        mediaId: string;
        mediaUrl?: string;
        fileName?: string;
        fileSize?: number;
        mimeType?: string;
      }
    ) => {
      if (!conversationId || !content.trim()) return;

      const uniqueId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : generateClientMessageId();

      const optimisticMessage: Message = {
        id: uniqueId,
        clientMessageId: uniqueId,
        conversationId,
        senderId: currentUserId,
        content: content.trim(),
        type,
        mediaId: mediaInfo?.mediaId,
        mediaUrl:
          mediaInfo?.mediaUrl ||
          (mediaInfo?.mediaId ? `/api/v1/media/${mediaInfo.mediaId}/url` : undefined),
        fileName: mediaInfo?.fileName,
        fileSize: mediaInfo?.fileSize,
        mimeType: mediaInfo?.mimeType,
        createdAt: new Date().toISOString(),
        readBy: [],
        status: 'sending',
        replyToId,
        ...({ sender_id: currentUserId }),
      };

      // Pure TanStack Query optimistic update using exact queryKey
      queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
        sortAndDeduplicateMessages([...old, optimisticMessage])
      );
      updateConversationPreviewInCache(queryClient, conversationId, optimisticMessage, false, currentUserId);

      // Stop typing on send
      sendTyping(false);

      // Emit chat.send frame over Realtime WebSocket
      const dispatched = realtimeService.sendChatMessage({
        conversation_id: conversationId,
        client_message_id: uniqueId,
        type,
        body: content.trim(),
        media_id: mediaInfo?.mediaId || null,
        media_url: mediaInfo?.mediaUrl || null,
        reply_to_id: replyToId || null,
      });

      // REST fallback to ensure guaranteed delivery and immediate resolution of optimistic state
      const sendViaRest = async () => {
        try {
          const ack = await persistentChatService.sendMessage(conversationId, {
            content: content.trim(),
            client_message_id: uniqueId,
            type,
            media_id: mediaInfo?.mediaId || null,
            media_url: mediaInfo?.mediaUrl || null,
            reply_to_id: replyToId || null,
          });
          if (ack) {
            reconcileAckInCache(queryClient, ack as any);
          }
        } catch (err) {
          console.error('REST message dispatch failed:', err);
          queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
            old.map((m) =>
              (m.clientMessageId === uniqueId || m.id === uniqueId) && m.status === 'sending'
                ? { ...m, status: 'failed' }
                : m
            )
          );
        }
      };

      if (!dispatched) {
        void sendViaRest();
      } else {
        setTimeout(() => {
          const currentList = queryClient.getQueryData<Message[]>(queryKey) || [];
          const stillSending = currentList.some(
            (m) => (m.clientMessageId === uniqueId || m.id === uniqueId) && m.status === 'sending'
          );
          if (stillSending) {
            void sendViaRest();
          }
        }, 2500);
      }
    },
    [conversationId, currentUserId, queryClient, queryKey, sendTyping]
  );

  // 8b. Send voice note mutation with optimistic upload and websocket dispatch
  const sendVoiceMessage = useCallback(
    async (blob: Blob, meta: VoiceMetadata) => {
      if (!conversationId) return;

      generateClientMessageId();

      // Format canonical duration string (mm:ss)
      const totalSeconds = Math.max(0, Math.floor(meta.durationMs / 1000));
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const content = `Voice note (${durationStr})`;

      // Create local preview URL for immediate local playback
      let localPreviewUrl: string | undefined;
      try {
        if (typeof window !== 'undefined' && window.URL?.createObjectURL) {
          localPreviewUrl = window.URL.createObjectURL(blob);
        }
      } catch {
        // Fallback if URL object creation fails in test/headless
      }

      // Canonical file extension
      const rawMime = meta.mimeType || blob.type || 'audio/webm';
      const baseMime = (meta.baseMimeType || rawMime.split(';')[0]).trim().toLowerCase();
      let ext = '.webm';
      if (baseMime.includes('ogg')) ext = '.ogg';
      else if (baseMime.includes('mp4') || baseMime.includes('m4a') || baseMime.includes('aac')) ext = '.mp4';
      else if (baseMime.includes('mpeg') || baseMime.includes('mp3')) ext = '.mp3';
      else if (baseMime.includes('wav')) ext = '.wav';

      const fileName = `voice_${Date.now()}${ext}`;

      const uniqueId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : generateClientMessageId();

      const optimisticMessage: Message = {
        id: uniqueId,
        clientMessageId: uniqueId,
        conversationId,
        senderId: currentUserId,
        content,
        type: 'voice',
        mediaUrl: localPreviewUrl,
        fileName,
        fileSize: meta.sizeBytes || blob.size,
        mimeType: rawMime,
        createdAt: new Date().toISOString(),
        readBy: [],
        status: 'uploading',
        ...({ sender_id: currentUserId }),
      };

      // Store in retry map for recovery
      voiceRetryMap.current.set(uniqueId, { blob, meta });

      // Optimistically insert into TanStack cache using exact queryKey
      queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
        sortAndDeduplicateMessages([...old, optimisticMessage])
      );
      updateConversationPreviewInCache(queryClient, conversationId, optimisticMessage, false, currentUserId);

      // Stop typing
      sendTyping(false);

      try {
        // Execute 3-step handshake: initiate -> uploadBytes -> confirm
        const uploadMeta: VoiceUploadMetadata = {
          durationMs: meta.durationMs,
          mimeType: meta.mimeType,
          baseMimeType: meta.baseMimeType,
          sizeBytes: meta.sizeBytes,
        };
        const uploadRes = await mediaService.uploadVoice(blob, uploadMeta);

        // Update optimistic message with confirmed mediaId and transition to 'sending'
        queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
          old.map((m) =>
            m.clientMessageId === uniqueId || m.id === uniqueId
              ? {
                ...m,
                mediaId: uploadRes.mediaId,
                mediaUrl: localPreviewUrl || `/api/v1/media/${uploadRes.mediaId}/url`,
                status: 'sending',
              }
              : m
          )
        );

        // Dispatch over WebSocket
        const dispatched = realtimeService.sendChatMessage({
          conversation_id: conversationId,
          client_message_id: uniqueId,
          type: 'voice',
          body: content,
          media_id: uploadRes.mediaId,
          media_url: `/api/v1/media/${uploadRes.mediaId}/url`,
          reply_to_id: null,
        });

        const sendVoiceViaRest = async () => {
          try {
            const ack = await persistentChatService.sendMessage(conversationId, {
              content,
              client_message_id: uniqueId,
              type: 'voice',
              media_id: uploadRes.mediaId,
              media_url: `/api/v1/media/${uploadRes.mediaId}/url`,
              reply_to_id: null,
            });
            if (ack) {
              reconcileAckInCache(queryClient, ack as any);
            }
          } catch (err) {
            console.error('REST voice message dispatch failed:', err);
            queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
              old.map((m) =>
                (m.clientMessageId === uniqueId || m.id === uniqueId) && m.status === 'sending'
                  ? { ...m, status: 'failed' }
                  : m
              )
            );
          }
        };

        if (!dispatched) {
          void sendVoiceViaRest();
        } else {
          setTimeout(() => {
            const currentList = queryClient.getQueryData<Message[]>(queryKey) || [];
            const stillSending = currentList.some(
              (m) => (m.clientMessageId === uniqueId || m.id === uniqueId) && m.status === 'sending'
            );
            if (stillSending) {
              void sendVoiceViaRest();
            }
          }, 2500);
        }
      } catch (err) {
        console.error('Failed to upload voice message:', err);
        queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
          old.map((m) =>
            m.clientMessageId === uniqueId || m.id === uniqueId ? { ...m, status: 'failed' } : m
          )
        );
      }
    },
    [conversationId, currentUserId, queryClient, queryKey, sendTyping]
  );

  // 9. Retry message using identical client_message_id (idempotency guarantee)
  const retryMessage = useCallback(
    (clientMessageId: string) => {
      if (!conversationId) return;

      const current = queryClient.getQueryData<Message[]>(queryKey) || [];
      const msg = current.find(
        (m) => m.clientMessageId === clientMessageId || m.id === clientMessageId
      );
      if (!msg) return;

      // Handle voice message retry (re-upload if mediaId was not yet confirmed)
      const voiceRetry = voiceRetryMap.current.get(clientMessageId);
      if (voiceRetry && msg.type === 'voice') {
        if (!msg.mediaId) {
          // Upload failed on first attempt: re-trigger upload
          queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
            old.map((m) =>
              m.clientMessageId === clientMessageId || m.id === clientMessageId
                ? { ...m, status: 'uploading' }
                : m
            )
          );

          mediaService
            .uploadVoice(voiceRetry.blob, voiceRetry.meta)
            .then((res) => {
              queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
                old.map((m) =>
                  m.clientMessageId === clientMessageId || m.id === clientMessageId
                    ? { ...m, mediaId: res.mediaId, status: 'sending' }
                    : m
                )
              );
              realtimeService.sendChatMessage({
                conversation_id: conversationId,
                client_message_id: clientMessageId,
                type: 'voice',
                body: msg.content,
                media_id: res.mediaId,
                media_url: `/api/v1/media/${res.mediaId}/url`,
                reply_to_id: msg.replyToId || null,
              });
            })
            .catch((err) => {
              console.error('Retry voice upload failed:', err);
              queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
                old.map((m) =>
                  m.clientMessageId === clientMessageId || m.id === clientMessageId
                    ? { ...m, status: 'failed' }
                    : m
                )
              );
            });
          return;
        }
      }

      // Mark status back to sending
      queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.clientMessageId === clientMessageId || m.id === clientMessageId
            ? { ...m, status: 'sending' }
            : m
        )
      );

      // Re-send using identical client_message_id and media attachments
      realtimeService.sendChatMessage({
        conversation_id: conversationId,
        client_message_id: clientMessageId,
        type: msg.type,
        body: msg.content,
        media_id: msg.mediaId || null,
        media_url: msg.mediaUrl || null,
        reply_to_id: msg.replyToId || null,
      });
    },
    [conversationId, queryClient, queryKey]
  );

  // 10. Older history pagination
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || isLoadingOlder || !hasMoreOlder) return;

    let oldestSeq: number | null = null;
    for (const m of messages) {
      if (m.sequence !== undefined) {
        if (oldestSeq === null || m.sequence < oldestSeq) {
          oldestSeq = m.sequence;
        }
      }
    }

    if (oldestSeq === null || oldestSeq <= 1) {
      setHasMoreOlder(false);
      return;
    }

    setIsLoadingOlder(true);
    try {
      const res = await persistentChatService.getMessages(
        conversationId,
        { before_seq: oldestSeq, limit: 50 },
        currentUserId
      );

      setHasMoreOlder(res.hasMore);
      oldestKnownSeqRef.current = res.oldestSeq;

      if (res.messages.length > 0) {
        mergeHistoryInCache(queryClient, conversationId, res.messages);
      }
    } catch (err) {
      console.warn('Failed to load older messages:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversationId, isLoadingOlder, hasMoreOlder, messages, currentUserId, queryClient]);

  // 11. Local reaction mutation (preserved for UI compatibility)
  const react = useCallback(
    (messageId: string, emoji: string) => {
      const updateFn = (m: Message) => {
        if (m.id === messageId) {
          const currentReactions = m.reactions || [];
          const existingIndex = currentReactions.findIndex(
            (r) => r.userId === currentUserId && r.emoji === emoji
          );

          let newReactions;
          if (existingIndex >= 0) {
            newReactions = [...currentReactions];
            newReactions.splice(existingIndex, 1);
          } else {
            newReactions = [
              ...currentReactions,
              { id: `r-${Date.now()}`, messageId, userId: currentUserId, emoji },
            ];
          }
          return { ...m, reactions: newReactions };
        }
        return m;
      };

      queryClient.setQueryData<Message[]>(queryKey, (old = []) => old.map(updateFn));
    },
    [currentUserId, queryClient, queryKey]
  );

  return {
    messages,
    isLoading,
    isTyping,
    typingUser,
    connectionStatus,
    hasMoreOlder,
    isLoadingOlder,
    loadOlderMessages,
    sendMessage,
    sendVoiceMessage,
    retryMessage,
    sendTyping,
    react,
  };
};
