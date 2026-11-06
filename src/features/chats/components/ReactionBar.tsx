import React, { useRef, useEffect } from 'react';
import styles from './ReactionBar.module.css';
import { CARTOON_REACTIONS } from './reactionData';

interface ReactionBarProps {
  onSelectReaction: (emoji: string) => void;
  onClose: () => void;
  isMine?: boolean;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  onSelectReaction,
  onClose,
  isMine = false,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={barRef}
      className={`${styles['reaction-bar']} ${isMine ? styles['reaction-bar-mine'] : styles['reaction-bar-theirs']}`}
      role="toolbar"
      aria-label="Message reactions"
    >
      {CARTOON_REACTIONS.map((r) => {
        const Icon = r.Icon;
        return (
          <button
            key={r.emoji}
            type="button"
            className={styles['reaction-btn']}
            onClick={(e) => {
              e.stopPropagation();
              onSelectReaction(r.emoji);
              onClose();
            }}
            title={r.label}
            aria-label={`React with ${r.label}`}
          >
            <div className={r.className}>
              <Icon size={20} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
