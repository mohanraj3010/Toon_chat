import type { UIChat } from '../api/conversationService';
import { Character } from '@/assets/characters/Character';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import styles from './Chats.module.css';
import { cn } from '@/shared/lib/utils';
import { BellOff, Pin } from 'lucide-react';
import { useAuth } from '@/features/auth/context/useAuth';

interface ChatRowProps {
  chat: UIChat;
  isSelected?: boolean;
  onClick: () => void;
}

export const ChatRow = ({ chat, isSelected, onClick }: ChatRowProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const isUnread = chat.unreadCount > 0;

  // Resolve the peer/other participant in direct chats
  const otherUser =
    chat.participants.find((p) => p.id !== currentUserId) || chat.participants[0];

  const { data: otherAvatarConfig } = useAvatarConfig(
    chat.type === 'direct' ? otherUser?.id : undefined
  );

  // Logic for character expression
  let expression: 'happy' | 'wink' | 'surprised' | 'sleepy' = 'happy';
  if (chat.isTyping) {
    expression = 'surprised';
  } else if (isUnread) {
    expression = 'wink';
  } else if (otherUser?.status === 'offline') {
    expression = 'sleepy';
  }

  // Format relative time safely
  let time = '';
  try {
    time = new Date(chat.updatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    time = '';
  }

  // Formatting preview prefix
  let previewText = chat.lastMessage?.content || '';
  if (chat.lastMessage?.senderId && chat.lastMessage.senderId === currentUserId) {
    previewText = `You: ${previewText}`;
  } else if (chat.type === 'group') {
    const sender = chat.participants.find((p) => p.id === chat.lastMessage?.senderId);
    if (sender) {
      previewText = `${sender.displayName}: ${previewText}`;
    }
  }

  const displayName = chat.name || otherUser?.displayName || 'Toon Citizen';
  const characterBase = chat.type === 'group' ? 7 : (otherUser?.themeBase || chat.themeBase || 1);

  return (
    <button
      className={cn(styles['chat-row'], isSelected && styles.selected)}
      onClick={onClick}
      role="listitem"
      aria-current={isSelected ? 'page' : undefined}
    >
      <div style={{ position: 'relative' }}>
        <div className={styles['chat-avatar-wrapper']}>
          {otherAvatarConfig ? (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 'auto',
              }}
            >
              <AvatarRenderer config={otherAvatarConfig} size={44} expression={expression} />
            </div>
          ) : (
            <Character
              base={characterBase}
              expression={expression}
              size={56}
              style={{ transform: 'scale(1.2) translateY(8px)' }}
            />
          )}
        </div>
        {otherUser?.status === 'online' && !chat.isTyping && (
          <div className={styles['chat-online-dot']} />
        )}
        {chat.isTyping && (
          <div
            className={styles['chat-online-dot']}
            style={{ backgroundColor: 'var(--color-warn)' }}
          />
        )}
      </div>

      <div className={styles['chat-content']}>
        <div className={styles['chat-header-row']}>
          <span className={styles['chat-name']}>{displayName}</span>
          <span className={cn(styles['chat-time'], isUnread && styles.unread)}>
            {time}
          </span>
        </div>
        <div className={styles['chat-preview-row']}>
          <span className={cn(styles['chat-preview'], isUnread && styles.unread)}>
            {chat.isTyping ? (
              <span style={{ color: 'var(--color-brand-500)', fontStyle: 'italic' }}>
                typing...
              </span>
            ) : (
              previewText || <span style={{ color: 'var(--color-text-muted)' }}>No messages yet</span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {chat.isMuted && <BellOff size={14} color="var(--color-text-muted)" />}
            {chat.isPinned && <Pin size={14} color="var(--color-text-muted)" />}
            {isUnread && <span className={styles['chat-badge']}>{chat.unreadCount}</span>}
          </div>
        </div>
      </div>
    </button>
  );
};
