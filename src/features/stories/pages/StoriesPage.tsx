import { useState, useCallback } from 'react';
import {
  useStoryGroups,
  useMarkStoryViewed,
  useReactToStory,
  useDeleteStory,
} from '../api/storiesService';
import { StoryCarousel } from '../components/StoryCarousel';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { StoryCreatorModal } from '../components/StoryCreatorModal';
import { StorySlide } from '../components/StorySlide';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { Sparkles, Plus, RefreshCw } from 'lucide-react';
import styles from './StoriesPage.module.css';

export default function StoriesPage() {
  const { data: groups, isLoading, isError, refetch } = useStoryGroups();
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

  // Flatten all latest stories for the card grid
  const recentStories = groups?.map((g) => ({
    group: g,
    latestStory: g.stories[g.stories.length - 1],
  })) || [];

  if (isError) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Character base={5} expression="surprised" size={120} />
          <h2 style={{ fontFamily: 'var(--font-display, Fredoka)', marginTop: 16 }}>Oops! Could not load stories</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>Let us try that again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className={styles.createBtn}
            style={{ margin: '0 auto' }}
          >
            <RefreshCw size={18} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Cartoon Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            <Sparkles size={28} color="#f97316" />
            <span>Toon Stories</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Share what you are up to with cartoon expressions, stickers, and doodles that vanish in 24 hours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreatorOpen(true)}
          className={styles.createBtn}
        >
          <Plus size={20} strokeWidth={3} />
          <span>New Story</span>
        </button>
      </div>

      {/* Top Carousel Bar */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Friends Stories</h2>
        </div>
        <StoryCarousel onStoryClick={(idx) => setActiveGroupIndex(idx)} />
      </div>

      {/* Story Cards Grid */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Snaps</h2>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            {recentStories.length} active updates
          </span>
        </div>

        {isLoading ? (
          <div className={styles.storyGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.storyCard} style={{ background: '#f1f5f9', borderStyle: 'dashed' }} />
            ))}
          </div>
        ) : recentStories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Character base={3} expression="wink" size={100} />
            <p style={{ fontFamily: 'var(--font-display, Fredoka)', fontSize: '1.2rem', marginTop: 12 }}>
              No stories right now! Be the first to share one.
            </p>
          </div>
        ) : (
          <div className={styles.storyGrid}>
            {recentStories.map(({ group, latestStory }) => {
              const groupIndex = groups?.findIndex((g) => g.userId === group.userId) ?? 0;
              return (
                <div
                  key={group.userId}
                  className={styles.storyCard}
                  onClick={() => setActiveGroupIndex(groupIndex)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActiveGroupIndex(groupIndex);
                  }}
                  aria-label={`View story from ${group.user.displayName}`}
                >
                  {group.hasUnviewed && (
                    <span className={styles.unviewedBadge}>NEW</span>
                  )}

                  {/* Thumbnail Preview */}
                  <div className={styles.cardPreview}>
                    <StorySlide story={latestStory} />
                  </div>

                  {/* Card Footer with User Info */}
                  <div className={styles.cardFooter}>
                    <div className={styles.cardAvatar}>
                      {group.user.avatarConfig ? (
                        <AvatarRenderer config={group.user.avatarConfig} size={32} />
                      ) : (
                        <Character
                          base={(group.user.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
                          size={32}
                        />
                      )}
                    </div>
                    <div className={styles.cardUserMeta}>
                      <span className={styles.cardUserName}>{group.user.displayName}</span>
                      <span className={styles.cardTime}>24h active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
}
