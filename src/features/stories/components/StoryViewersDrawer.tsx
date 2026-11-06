import { memo } from 'react';
import type { StoryItem } from '../types';
import { Character } from '@/assets/characters/Character';
import { Eye, Trash2, X } from 'lucide-react';
import styles from './StoryViewersDrawer.module.css';

interface StoryViewersDrawerProps {
  story: StoryItem;
  isOpen: boolean;
  onClose: () => void;
  onDeleteStory: (storyId: string) => void;
}

export const StoryViewersDrawer = memo(function StoryViewersDrawer({
  story,
  isOpen,
  onClose,
  onDeleteStory,
}: StoryViewersDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Story viewers">
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <h3 className={styles.title}>
            <Eye size={18} />
            <span>Story Views ({story.viewers?.length || 0})</span>
          </h3>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close viewers">
            <X size={16} />
          </button>
        </div>

        <div className={styles.viewerList}>
          {story.viewers && story.viewers.length > 0 ? (
            story.viewers.map((viewer) => (
              <div key={viewer.id} className={styles.viewerItem}>
                <div className={styles.viewerInfo}>
                  <div className={styles.viewerAvatar}>
                    <Character base={(viewer.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8} size={32} />
                  </div>
                  <span className={styles.viewerName}>{viewer.displayName}</span>
                </div>
                <span className={styles.viewedTime}>Just now</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-muted)' }}>
              No views yet. Share with friends!
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onDeleteStory(story.id);
            onClose();
          }}
          className={styles.deleteBtn}
        >
          <Trash2 size={16} />
          <span>Delete Story</span>
        </button>
      </div>
    </div>
  );
});
