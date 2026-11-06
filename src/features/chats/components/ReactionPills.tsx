import React, { useMemo } from 'react';
import type { Reaction } from '@/shared/types';
import styles from './ReactionBar.module.css';

interface ReactionPillsProps {
  reactions?: Reaction[];
  currentUserId?: string;
  onReact: (emoji: string) => void;
  isMine?: boolean;
}

interface AggregatedReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const ReactionPills: React.FC<ReactionPillsProps> = ({
  reactions = [],
  currentUserId,
  onReact,
  isMine = false,
}) => {
  const aggregated = useMemo<AggregatedReaction[]>(() => {
    if (!reactions || reactions.length === 0) return [];

    const map = new Map<string, { count: number; hasReacted: boolean }>();

    for (const r of reactions) {
      const entry = map.get(r.emoji) || { count: 0, hasReacted: false };
      entry.count += 1;
      if (currentUserId && r.userId === currentUserId) {
        entry.hasReacted = true;
      }
      map.set(r.emoji, entry);
    }

    return Array.from(map.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasReacted: data.hasReacted,
    }));
  }, [reactions, currentUserId]);

  if (aggregated.length === 0) return null;

  return (
    <div
      className={`${styles['reaction-pills-container']} ${isMine ? styles['reaction-pills-mine'] : styles['reaction-pills-theirs']}`}
      role="group"
      aria-label="Message reaction counts"
    >
      {aggregated.map((item) => (
        <button
          key={item.emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReact(item.emoji);
          }}
          className={`${styles['reaction-pill']} ${item.hasReacted ? styles['reaction-pill-active'] : ''}`}
          title={item.hasReacted ? `You reacted with ${item.emoji} (click to remove)` : `React with ${item.emoji}`}
          aria-label={`${item.emoji} ${item.count} reaction${item.count > 1 ? 's' : ''}${item.hasReacted ? ', you reacted' : ''}`}
        >
          <span className={styles['reaction-pill-emoji']}>{item.emoji}</span>
          <span className={styles['reaction-pill-count']}>{item.count}</span>
        </button>
      ))}
    </div>
  );
};

