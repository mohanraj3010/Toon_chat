import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem as NotificationItemType } from '../types';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { Trash2 } from 'lucide-react';
import styles from './NotificationItem.module.css';

interface NotificationItemProps {
  notification: NotificationItemType;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onFriendAction: (id: string, action: 'accept' | 'decline') => void;
}

const TYPE_EMOJI: Record<NotificationItemType['type'], string> = {
  friend_request: '👋',
  message: '💬',
  reaction: '🔥',
  story_interaction: '✨',
  group_activity: '🎉',
  world_activity: '🌍',
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toCharacterExpression(expr?: string): 'happy' | 'wink' | 'surprised' | 'sleepy' {
  if (expr === 'wink' || expr === 'surprised' || expr === 'sleepy') return expr;
  return 'happy';
}

export const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onFriendAction,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { actor, content, expression, timestamp, read, targetUrl, actionData } = notification;

  const handleClick = () => {
    if (!read) onMarkRead(notification.id);
    if (targetUrl) navigate(targetUrl);
  };

  return (
    <div
      className={`${styles.card} ${!read ? styles.unread : ''}`}
      onClick={handleClick}
      role="article"
      aria-label={`Notification from ${actor.displayName}`}
    >
      {/* Cartoon Avatar with expression */}
      <div className={styles.avatarWrapper}>
        {actor.avatarConfig ? (
          <AvatarRenderer config={actor.avatarConfig} size={48} expression={expression} />
        ) : (
          <Character
            base={(actor.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
            size={48}
            expression={toCharacterExpression(expression)}
          />
        )}
        <span className={styles.typeBadge} aria-hidden="true">
          {TYPE_EMOJI[notification.type]}
        </span>
      </div>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        <div className={styles.textRow}>
          <strong className={styles.actorName}>{actor.displayName}</strong>
          <span>{content}</span>
        </div>

        <div className={styles.timeRow}>
          <span>{formatTimeAgo(timestamp)}</span>
          {!read && <span className={styles.unreadDot} title="Unread" />}
        </div>

        {/* Inline friend request actions */}
        {Boolean(actionData?.friendId) && (
          <div className={styles.actionRow} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onFriendAction(notification.id, 'accept')}
              className={styles.acceptBtn}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onFriendAction(notification.id, 'decline')}
              className={styles.declineBtn}
            >
              Decline
            </button>
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className={styles.deleteBtn}
        title="Delete notification"
        aria-label="Delete notification"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});
