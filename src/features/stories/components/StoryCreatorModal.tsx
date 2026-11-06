import { useState, useMemo, useRef } from 'react';
import type { StoryType, StoryItem, StorySticker } from '../types';
import { useCreateStory } from '../api/storiesService';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { useAuth } from '@/features/auth/context/useAuth';
import { StorySlide } from './StorySlide';
import { showToast } from '@/shared/ui/Toast';
import { useModalA11y } from '@/shared/hooks/useModalA11y';
import { Sparkles, X, Send } from 'lucide-react';
import styles from './StoryCreatorModal.module.css';

const PRESET_BG_COLORS = ['#ffedd5', '#fce7f3', '#e0f2fe', '#f3e8ff', '#dcfce7', '#fef3c7'];
const PRESET_PATTERNS = ['dots', 'stars', 'stripes', 'clouds', 'hearts', 'solid'] as const;
const PRESET_EXPRESSIONS = [
  { id: 'happy', label: 'Happy 😊' },
  { id: 'wink', label: 'Wink 😉' },
  { id: 'surprised', label: 'Surprised 😲' },
  { id: 'cool', label: 'Cool 😎' },
  { id: 'laughing', label: 'Laughing 😆' },
  { id: 'neutral', label: 'Neutral 😐' },
] as const;

const AVAILABLE_STICKERS = ['✨', '💖', '🧋', '🛹', '🍕', '🎉', '🎧', '🌸', '⚡', '🥑'];

interface StoryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoryCreatorModal = ({ isOpen, onClose }: StoryCreatorModalProps) => {
  const { data: avatarConfig } = useAvatarConfig();
  const { user } = useAuth();
  const createMutation = useCreateStory();
  const containerRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    isOpen,
    onClose,
    containerRef,
  });

  const [type, setType] = useState<StoryType>('expression');
  const [caption, setCaption] = useState('Feeling awesome today! ✨');
  const [expression, setExpression] = useState<'happy' | 'wink' | 'surprised' | 'cool' | 'sleepy' | 'laughing' | 'neutral'>('happy');
  const [bgColor, setBgColor] = useState(PRESET_BG_COLORS[0]);
  const [pattern, setPattern] = useState<typeof PRESET_PATTERNS[number]>('dots');
  const [stickers, setStickers] = useState<StorySticker[]>([
    { id: 'stk-1', emoji: '✨', x: 25, y: 35, scale: 1.3, rotation: 10 },
  ]);

  const toggleSticker = (emoji: string) => {
    const exists = stickers.find((s) => s.emoji === emoji);
    if (exists) {
      setStickers((prev) => prev.filter((s) => s.emoji !== emoji));
    } else {
      setStickers((prev) => [
        ...prev,
        {
          id: `stk-${Date.now()}-${emoji}`,
          emoji,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          scale: 1.2,
          rotation: (Math.random() - 0.5) * 30,
        },
      ]);
    }
  };

  // Preview StoryItem
  const previewStory: StoryItem = useMemo(() => ({
    id: 'preview',
    userId: user?.id || 'me-current-user',
    user: {
      id: user?.id || 'me-current-user',
      username: user?.username || 'You',
      displayName: avatarConfig?.name || user?.displayName || 'You',
      avatarConfig: avatarConfig || undefined,
    },
    type,
    content: {
      caption,
      expression,
      backgroundColor: bgColor,
      backgroundPattern: pattern,
      stickers,
      textColor: '#1e293b',
      fontFamily: 'fredoka',
    },
    createdAt: '2026-10-17T00:00:00.000Z',
    expiresAt: '2026-10-18T00:00:00.000Z',
    viewed: true,
    reactions: [],
    viewers: [],
  }), [type, caption, expression, bgColor, pattern, stickers, avatarConfig, user]);

  const handlePost = async () => {
    try {
      await createMutation.mutateAsync({
        input: {
          type,
          content: {
            caption,
            expression,
            backgroundColor: bgColor,
            backgroundPattern: pattern,
            stickers,
            textColor: '#1e293b',
            fontFamily: 'fredoka',
          },
        },
        customAvatar: avatarConfig || undefined,
      });
      showToast('Your cartoon story is live for 24h! 🌟', 'success');
      onClose();
    } catch {
      showToast('Failed to create story. Please try again.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Create story modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} ref={containerRef} tabIndex={-1}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Sparkles size={20} color="var(--color-brand-500)" />
            <span>Add to Your Story</span>
          </h2>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          {/* 1. Pick Story Type */}
          <div>
            <div className={styles.sectionTitle}>1. Choose Story Style</div>
            <div className={styles.typeGrid}>
              <button
                type="button"
                onClick={() => setType('expression')}
                className={`${styles.typeCard} ${type === 'expression' ? styles.active : ''}`}
              >
                <span className={styles.typeEmoji}>🎭</span>
                <span className={styles.typeLabel}>Expression</span>
              </button>
              <button
                type="button"
                onClick={() => setType('sticker')}
                className={`${styles.typeCard} ${type === 'sticker' ? styles.active : ''}`}
              >
                <span className={styles.typeEmoji}>🛹</span>
                <span className={styles.typeLabel}>Sticker Scene</span>
              </button>
              <button
                type="button"
                onClick={() => setType('text')}
                className={`${styles.typeCard} ${type === 'text' ? styles.active : ''}`}
              >
                <span className={styles.typeEmoji}>💬</span>
                <span className={styles.typeLabel}>Big Text</span>
              </button>
            </div>
          </div>

          {/* 2. Live Preview Frame */}
          <div>
            <div className={styles.sectionTitle}>2. Live Preview</div>
            <div className={styles.previewFrame}>
              <StorySlide story={previewStory} />
            </div>
          </div>

          {/* 3. Compose Controls */}
          <div>
            <div className={styles.sectionTitle}>3. Customize Details</div>

            {/* Expression Picker (for expression and sticker styles) */}
            {type !== 'text' && (
              <div style={{ marginBottom: 12 }}>
                <label className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Avatar Mood:</label>
                <div className={styles.chipRow}>
                  {PRESET_EXPRESSIONS.map((expr) => (
                    <button
                      key={expr.id}
                      type="button"
                      onClick={() => setExpression(expr.id)}
                      className={`${styles.chip} ${expression === expr.id ? styles.active : ''}`}
                    >
                      {expr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background Color & Pattern */}
            <div style={{ marginBottom: 12 }}>
              <label className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Background Color & Pattern:</label>
              <div className={styles.chipRow} style={{ marginBottom: 8 }}>
                {PRESET_BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBgColor(c)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: c,
                      border: bgColor === c ? '3px solid #1e293b' : '2px solid #cbd5e1',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              <div className={styles.chipRow}>
                {PRESET_PATTERNS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPattern(p)}
                    className={`${styles.chip} ${pattern === p ? styles.active : ''}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers Selector */}
            <div style={{ marginBottom: 12 }}>
              <label className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Tap Stickers to Add:</label>
              <div className={styles.chipRow}>
                {AVAILABLE_STICKERS.map((stk) => {
                  const isSelected = stickers.some((s) => s.emoji === stk);
                  return (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => toggleSticker(stk)}
                      className={`${styles.chip} ${isSelected ? styles.active : ''}`}
                      style={{ fontSize: 18, padding: '4px 10px' }}
                    >
                      {stk}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption text */}
            <div>
              <label className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Caption / Text (max 120 chars):</label>
              <textarea
                value={caption}
                maxLength={120}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Share what is on your mind..."
                rows={2}
                className={styles.captionInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={handlePost}
            className={styles.postBtn}
          >
            <Send size={16} />
            <span>{createMutation.isPending ? 'Posting...' : 'Share to Story'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
