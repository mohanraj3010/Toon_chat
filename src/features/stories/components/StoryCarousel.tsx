import { useState, useCallback } from 'react';
import {
  useStoryGroups,
  useMarkStoryViewed,
  useReactToStory,
  useDeleteStory,
} from '../api/storiesService';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { Character } from '@/assets/characters/Character';
import { useAuth } from '@/features/auth/context/useAuth';
import { StoryViewerModal } from './StoryViewerModal';
import { StoryCreatorModal } from './StoryCreatorModal';
import { Plus } from 'lucide-react';
import styles from './StoryCarousel.module.css';

interface StoryCarouselProps {
  onStoryClick?: (groupIndex: number) => void;
}

export const StoryCarousel = ({ onStoryClick }: StoryCarouselProps) => {
  const { data: groups, isLoading } = useStoryGroups();
  const { data: userAvatarConfig } = useAvatarConfig();
  const { user } = useAuth();
  const { mutate: markStoryViewed } = useMarkStoryViewed();
  const { mutate: reactToStory } = useReactToStory();
  const { mutate: deleteStory } = useDeleteStory();

  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  const handleMarkViewed = useCallback((storyId: string) => {
    markStoryViewed(storyId);
  }, [markStoryViewed]);

  const handleReact = useCallback((storyId: string, emoji: string) => {
    reactToStory({ storyId, emoji });
  }, [reactToStory]);

  const handleDeleteStory = useCallback((storyId: string) => {
    deleteStory(storyId);
  }, [deleteStory]);

  // Check if current user has an active story
  const myGroupIndex = groups?.findIndex((g) => g.userId === 'me-current-user') ?? -1;
  const hasMyStory = myGroupIndex !== -1;

  // Filter out myGroup from friend list to show separately as "Your story" tile
  const friendGroups = groups?.filter((g) => g.userId !== 'me-current-user') || [];

  const handleOpenViewer = (index: number) => {
    setActiveGroupIndex(index);
    onStoryClick?.(index);
  };

  if (isLoading) {
    return (
      <div className={styles.carouselContainer}>
        <div className={styles.carouselRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonItem}>
              <div className={styles.skeletonRing} />
              <div className={styles.skeletonLabel} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselRow} role="region" aria-label="Stories Carousel">
        {/* "Your Story" Add / View Tile */}
        <div
          className={styles.storyItem}
          onClick={() => {
            if (hasMyStory && myGroupIndex !== -1) {
              handleOpenViewer(myGroupIndex);
            } else {
              setIsCreatorOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={hasMyStory ? 'View your story' : 'Add to your story'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (hasMyStory && myGroupIndex !== -1) handleOpenViewer(myGroupIndex);
              else setIsCreatorOpen(true);
            }
          }}
        >
          <div className={`${styles.ringWrapper} ${hasMyStory ? styles.ringUnviewed : styles.ringViewed}`}>
            <div className={styles.avatarInner}>
              {userAvatarConfig ? (
                <AvatarRenderer config={userAvatarConfig} size={58} />
              ) : (
                // Dynamic initials fallback — shows the authenticated user's initial
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: 'var(--color-brand-200, #fed7aa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--color-brand-700, #c2410c)',
                    fontFamily: 'var(--font-display, Fredoka, cursive)',
                  }}
                >
                  {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div
              className={styles.addBadge}
              onClick={(e) => {
                e.stopPropagation();
                setIsCreatorOpen(true);
              }}
              title="Add story"
              role="button"
              aria-label="Add new story"
            >
              <Plus size={14} strokeWidth={3} />
            </div>
          </div>
          <span className={styles.nameLabel}>Your Story</span>
        </div>

        {/* Friend Story Tiles */}
        {friendGroups.map((group) => {
          // Find original index in full groups array
          const fullIndex = groups?.findIndex((g) => g.userId === group.userId) ?? 0;
          return (
            <div
              key={group.userId}
              className={styles.storyItem}
              onClick={() => handleOpenViewer(fullIndex)}
              role="button"
              tabIndex={0}
              aria-label={`${group.user.displayName}'s story, ${group.hasUnviewed ? 'unviewed' : 'viewed'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleOpenViewer(fullIndex);
              }}
            >
              <div
                className={`${styles.ringWrapper} ${
                  group.hasUnviewed ? styles.ringUnviewed : styles.ringViewed
                }`}
              >
                <div className={styles.avatarInner}>
                  {group.user.avatarConfig ? (
                    <AvatarRenderer config={group.user.avatarConfig} size={58} />
                  ) : (
                    <Character
                      base={(group.user.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
                      size={58}
                    />
                  )}
                </div>
              </div>
              <span className={styles.nameLabel}>{group.user.displayName}</span>
            </div>
          );
        })}
      </div>

      {/* Viewer Modal */}
      {activeGroupIndex !== null && groups && (
        <StoryViewerModal
          groups={groups}
          initialGroupIndex={activeGroupIndex}
          isOpen={activeGroupIndex !== null}
          onClose={() => setActiveGroupIndex(null)}
          onMarkViewed={handleMarkViewed}
          onReact={handleReact}
          onDeleteStory={handleDeleteStory}
        />
      )}

      {/* Creator Modal */}
      <StoryCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
      />
    </div>
  );
};
