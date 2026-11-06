import { memo } from 'react';
import type { PinnedMessage } from '../types';
import { X } from 'lucide-react';
import styles from './PinnedMessageBanner.module.css';

interface PinnedMessageBannerProps {
  pinnedMessage: PinnedMessage;
  canUnpin?: boolean;
  onUnpin?: () => void;
  onClick?: () => void;
}

export const PinnedMessageBanner = memo(function PinnedMessageBanner({
  pinnedMessage,
  canUnpin = false,
  onUnpin,
  onClick,
}: PinnedMessageBannerProps) {
  return (
    <div
      className={styles.banner}
      onClick={onClick}
      role="region"
      aria-label="Pinned group message"
    >
      <div className={styles.leftInfo}>
        <span className={styles.pinIcon} aria-hidden="true">📌</span>
        <div className={styles.contentCol}>
          <span className={styles.label}>Pinned by {pinnedMessage.pinnedBy}</span>
          <span className={styles.text}>{pinnedMessage.content}</span>
        </div>
      </div>

      {canUnpin && onUnpin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className={styles.unpinBtn}
          title="Unpin message"
          aria-label="Unpin message"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});
