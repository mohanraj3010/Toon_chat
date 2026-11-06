import type { StoryItem } from '../types';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { Character } from '@/assets/characters/Character';
import styles from './StorySlide.module.css';

function toCharacterExpression(expr?: string): 'happy' | 'wink' | 'surprised' | 'sleepy' {
  if (expr === 'wink' || expr === 'surprised' || expr === 'sleepy') return expr;
  return 'happy';
}

interface StorySlideProps {
  story: StoryItem;
}

export const StorySlide = ({ story }: StorySlideProps) => {
  const { type, content, user } = story;
  const patternClass = styles[`pattern-${content.backgroundPattern || 'dots'}`] || styles['pattern-dots'];

  return (
    <div
      className={`${styles.slideContainer} ${patternClass}`}
      style={{ backgroundColor: content.backgroundColor || '#ffedd5' }}
    >
      {/* 1. Cartoon Expression Story */}
      {type === 'expression' && (
        <div className={styles.expressionStage}>
          <div className={styles.avatarBounce}>
            {user.avatarConfig ? (
              <AvatarRenderer
                config={user.avatarConfig}
                size={180}
                expression={content.expression}
              />
            ) : (
              <Character
                base={(user.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
                expression={toCharacterExpression(content.expression)}
                size={180}
              />
            )}
          </div>

          {content.caption && (
            <div className={styles.cartoonSpeechBubble}>
              <p className={styles.bubbleText}>{content.caption}</p>
            </div>
          )}

          {/* Decorative stickers */}
          {content.stickers?.map((sticker) => (
            <span
              key={sticker.id}
              className={styles.placedSticker}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
                fontSize: `${28 * (sticker.scale || 1)}px`,
              }}
            >
              {sticker.emoji}
            </span>
          ))}
        </div>
      )}

      {/* 2. Sticker Scene Story */}
      {type === 'sticker' && (
        <div className={styles.stickerStage}>
          {content.caption && (
            <div className={styles.stickerHeadline}>
              <span>{content.caption}</span>
            </div>
          )}

          {/* Centered Character Accent */}
          <div style={{ margin: 'auto 0' }}>
            {user.avatarConfig ? (
              <AvatarRenderer
                config={user.avatarConfig}
                size={140}
                expression={content.expression}
              />
            ) : (
              <Character
                base={(user.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
                expression={toCharacterExpression(content.expression)}
                size={140}
              />
            )}
          </div>

          {content.stickers?.map((sticker) => (
            <span
              key={sticker.id}
              className={styles.placedSticker}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
                fontSize: `${36 * (sticker.scale || 1)}px`,
              }}
            >
              {sticker.emoji}
            </span>
          ))}
        </div>
      )}

      {/* 3. Text on Color Story */}
      {type === 'text' && (
        <div className={styles.textStage}>
          <h2
            className={styles.bigCartoonText}
            style={{
              color: content.textColor || '#1e293b',
              fontFamily: content.fontFamily === 'nunito' ? 'var(--font-sans, Nunito, sans-serif)' : 'var(--font-display, Fredoka, cursive)',
            }}
          >
            {content.caption || 'Hello ToonChat!'}
          </h2>

          {content.stickers?.map((sticker) => (
            <span
              key={sticker.id}
              className={styles.placedSticker}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
                fontSize: `${32 * (sticker.scale || 1)}px`,
              }}
            >
              {sticker.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
