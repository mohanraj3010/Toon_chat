import { useRef, useEffect } from 'react';
import type { Message } from '@/shared/types';
import { useAuth } from '@/features/auth/context/useAuth';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { EmptyConversation } from './EmptyConversation';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';

interface Props {
  messages: Message[];
  isTyping: boolean;
  participantBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  onSendAction?: (text: string, type: 'text' | 'sticker') => void;
  onRetry?: (clientMessageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onLoadOlder?: () => void;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
  isGroup?: boolean;
  participantsMap?: Record<string, { displayName: string; themeBase?: number; avatarConfig?: any }>;
}

export const MessageList = ({
  messages,
  isTyping,
  participantBase,
  onSendAction,
  onRetry,
  onReact,
  onLoadOlder,
  hasMoreOlder = false,
  isLoadingOlder = false,
  isGroup = false,
  participantsMap,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const currentUserId = user?.id;

  useEffect(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    const lastMessage = messages[messages.length - 1];
    const lastSenderId =
      (lastMessage as any)?.sender_id ??
      lastMessage?.senderId ??
      (lastMessage as any)?.sender?.id;
    const isSentByMe = Boolean(
      currentUserId &&
      lastSenderId &&
      String(lastSenderId).trim().toLowerCase() === String(currentUserId).trim().toLowerCase()
    );

    if (isNearBottom || isSentByMe) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, currentUserId]);

  if (messages.length === 0 && !isTyping) {
    return <EmptyConversation base={participantBase} onAction={onSendAction} />;
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Older history pagination trigger */}
      {hasMoreOlder && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={isLoadingOlder}
            style={{
              background: 'var(--color-bg-surface, #ffffff)',
              border: '2px solid var(--color-outline, #1e293b)',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display, Fredoka, cursive)',
              color: 'var(--color-text, #1e293b)',
              cursor: isLoadingOlder ? 'wait' : 'pointer',
              boxShadow: 'var(--shadow-sticker, 2px 2px 0 #1e293b)',
              transition: 'transform 0.1s ease',
            }}
          >
            {isLoadingOlder ? 'Loading older memories... 📜' : 'Load earlier messages 📜'}
          </button>
        </div>
      )}

      {messages.map((message, i) => {
        const rawSenderId =
          (message as any)?.sender_id ??
          message?.senderId ??
          (message as any)?.sender?.id;
        const isOwnMessage = Boolean(
          currentUserId &&
          rawSenderId &&
          String(rawSenderId).trim().toLowerCase() === String(currentUserId).trim().toLowerCase()
        );
        const isMine = isOwnMessage;

        // Grouping: hide tail if next message is from same sender within 2 mins
        let showTail = true;
        const nextMsg = messages[i + 1];
        const nextSenderId =
          (nextMsg as any)?.sender_id ??
          nextMsg?.senderId ??
          (nextMsg as any)?.sender?.id;

        if (
          nextMsg &&
          rawSenderId &&
          nextSenderId &&
          String(nextSenderId).trim().toLowerCase() === String(rawSenderId).trim().toLowerCase()
        ) {
          const timeDiff =
            new Date(nextMsg.createdAt).getTime() - new Date(message.createdAt).getTime();
          if (timeDiff < 120000) {
            showTail = false;
          }
        }

        const sender =
          (rawSenderId ? participantsMap?.[rawSenderId] : undefined) ||
          participantsMap?.[message.senderId] ||
          (message.sender
            ? {
                displayName: message.sender.displayName,
                themeBase: undefined,
                avatarConfig: undefined,
              }
            : undefined);

        const senderAvatar = sender?.avatarConfig ? (
          <AvatarRenderer config={sender.avatarConfig} size={22} />
        ) : (
          <Character
            base={(sender?.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
            size={22}
          />
        );

        return (
          <MessageBubble
            key={message.clientMessageId || message.id}
            message={message}
            isMine={isMine}
            showTail={showTail}
            showSender={isGroup && !isMine}
            senderName={sender?.displayName}
            senderAvatar={senderAvatar}
            onRetry={onRetry}
            onReact={onReact}
            currentUserId={currentUserId}
          />
        );
      })}

      {isTyping && <TypingIndicator base={participantBase} />}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
};
