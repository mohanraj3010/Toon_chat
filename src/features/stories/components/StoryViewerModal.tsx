import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserStoryGroup } from '../types';
import { StorySlide } from './StorySlide';
import { FlyingReactions, type ReactionParticle } from './FlyingReactions';
import { StoryViewersDrawer } from './StoryViewersDrawer';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { X, Play, Pause, Send, Eye } from 'lucide-react';
import { showToast } from '@/shared/ui/Toast';
import styles from './StoryViewerModal.module.css';

const STORY_DURATION_MS = 5000;
const QUICK_EMOJIS = ['❤️', '😂', '🔥', '🎉', '😮', '✨', '🥑'];

interface StoryViewerModalProps {
  groups: UserStoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onMarkViewed: (storyId: string) => void;
  onReact: (storyId: string, emoji: string) => void;
  onDeleteStory: (storyId: string) => void;
}

export const StoryViewerModal = ({
  groups,
  initialGroupIndex,
  initialStoryIndex = 0,
  isOpen,
  onClose,
  onMarkViewed,
  onReact,
  onDeleteStory,
}: StoryViewerModalProps) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const markedStoryIdsRef = useRef<Set<string>>(new Set());
  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwnStory = currentGroup?.userId === 'me-current-user';

  // Mark story as viewed on slide entry (at most once per story ID)
  useEffect(() => {
    const storyId = currentStory?.id;
    if (storyId && !currentStory.viewed && !markedStoryIdsRef.current.has(storyId)) {
      markedStoryIdsRef.current.add(storyId);
      onMarkViewed(storyId);
    }
  }, [currentStory, onMarkViewed]);

  const handleNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, groups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, groups]);

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen || isPaused || showViewersDrawer) return;

    const interval = 50;
    const step = (interval / STORY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, showViewersDrawer, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Reaction triggering
  const handleTriggerReaction = (emoji: string) => {
    if (!currentStory) return;
    onReact(currentStory.id, emoji);

    const newParticles: ReactionParticle[] = Array.from({ length: 4 }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      emoji,
      x: 35 + Math.random() * 30,
      rotation: (Math.random() - 0.5) * 40,
    }));

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 1800);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentGroup) return;
    showToast(`Reply sent to ${currentGroup.user.displayName}! 💬`, 'success');
    setReplyText('');
    setIsPaused(false);
  };

  if (!isOpen || !currentStory || !currentGroup) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${currentGroup.user.displayName}'s story`}
      onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (touchStartY.current !== null) {
          const deltaY = e.changedTouches[0].clientY - touchStartY.current;
          if (deltaY > 60) onClose();
          touchStartY.current = null;
        }
      }}
    >
      <div
        className={styles.stageFrame}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress segments */}
        <div className={styles.segmentsRow}>
          {currentGroup.stories.map((s, idx) => {
            const fillWidth = idx < storyIndex ? 100 : idx === storyIndex ? progress : 0;
            return (
              <div key={s.id} className={styles.segmentTrack}>
                <div className={styles.segmentFill} style={{ width: `${fillWidth}%` }} />
              </div>
            );
          })}
        </div>

        {/* Top user bar */}
        <div className={styles.topBar}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {currentGroup.user.avatarConfig ? (
                <AvatarRenderer config={currentGroup.user.avatarConfig} size={36} />
              ) : (
                <Character base={(currentGroup.user.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8} size={36} />
              )}
            </div>
            <div>
              <div className={styles.userName}>{currentGroup.user.displayName}</div>
              <div className={styles.timeAgo}>Active 24h</div>
            </div>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className={styles.iconBtn}
              aria-label={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button type="button" onClick={onClose} className={styles.iconBtn} aria-label="Close story">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tap zones */}
        <div className={styles.tapZonePrev} onClick={handlePrev} role="button" aria-label="Previous story" />
        <div className={styles.tapZoneNext} onClick={handleNext} role="button" aria-label="Next story" />

        {/* Slide Content */}
        <div className={styles.contentArea}>
          <StorySlide story={currentStory} />
        </div>

        {/* Floating animated reactions */}
        <FlyingReactions particles={particles} />

        {/* Bottom bar */}
        <div className={styles.bottomBar} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          {isOwnStory ? (
            <button
              type="button"
              onClick={() => setShowViewersDrawer(true)}
              className={styles.viewsBtn}
            >
              <Eye size={16} />
              <span>Views ({currentStory.viewers?.length || 0})</span>
            </button>
          ) : (
            <>
              {/* Quick Reactions */}
              <div className={styles.quickReactions}>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleTriggerReaction(emoji)}
                    className={styles.reactionBtn}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <form onSubmit={handleSendReply} className={styles.replyRow}>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  placeholder={`Reply to ${currentGroup.user.displayName}...`}
                  className={styles.replyInput}
                />
                <button type="submit" className={styles.sendBtn} aria-label="Send reply">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Viewers Drawer */}
        <StoryViewersDrawer
          story={currentStory}
          isOpen={showViewersDrawer}
          onClose={() => setShowViewersDrawer(false)}
          onDeleteStory={(id) => {
            onDeleteStory(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
};
