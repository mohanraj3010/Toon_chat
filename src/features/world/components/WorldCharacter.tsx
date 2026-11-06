import React, { memo } from 'react';
import type { WorldCharacterState } from '../types';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import styles from './WorldCharacter.module.css';

interface WorldCharacterProps {
  character: WorldCharacterState;
  onSelect?: (character: WorldCharacterState, event: React.MouseEvent) => void;
}

export const WorldCharacter = memo(function WorldCharacter({
  character,
  onSelect,
}: WorldCharacterProps) {
  const {
    displayName,
    avatarConfig,
    position,
    facing,
    action,
    speech,
    emote,
    isCurrentUser,
  } = character;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(character, e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(character, e as unknown as React.MouseEvent);
    }
  };

  // Derive leg/pants color from outfit secondary or a pleasant denim/khaki
  const pantsColor = avatarConfig.outfitSecondaryColor || '#1e3a8a';
  const shoeColor = '#ffffff';

  return (
    <div
      className={`${styles.characterWrapper} ${styles[action] || styles.idle}`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        zIndex: Math.floor(position.y),
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${displayName}${isCurrentUser ? ' (You)' : ''}: ${character.statusText}`}
    >
      {/* 1. Speech Bubble (always upright, not flipped) */}
      {speech && (
        <div className={styles.speechBubble}>
          {speech.text}
        </div>
      )}

      {/* 2. Floating Emote Reaction */}
      {emote && (
        <div key={emote.id} className={styles.floatingEmote}>
          {emote.emoji}
        </div>
      )}

      {/* 3. Ground Shadow */}
      <div className={styles.groundShadow} />

      {/* 4. Flippable Body Container */}
      <div
        className={styles.bodyContainer}
        style={{
          transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
        }}
      >
        {/* Upper Body (AvatarRenderer) */}
        <AvatarRenderer
          config={avatarConfig}
          size={68}
          showBackground={false}
          animated={true}
        />

        {/* Lower Body: Cartoon Legs & Sneakers */}
        <svg
          className={styles.legsSvg}
          width="48"
          height="28"
          viewBox="0 0 48 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Left Leg */}
          <g className={styles.leftLeg}>
            <rect
              x="12"
              y="0"
              width="8"
              height="16"
              rx="4"
              fill={pantsColor}
              stroke="#1e1e24"
              strokeWidth="2.4"
            />
            {/* Left Sneaker */}
            <path
              d="M 10 14 C 10 13 14 13 18 13 C 22 13 24 16 24 20 C 24 23 21 24 12 24 C 9 24 8 22 9 18 Z"
              fill={shoeColor}
              stroke="#1e1e24"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* Sneaker stripe / sole */}
            <line x1="10" y1="21" x2="23" y2="21" stroke="#1e1e24" strokeWidth="1.6" />
          </g>

          {/* Right Leg */}
          <g className={styles.rightLeg}>
            <rect
              x="28"
              y="0"
              width="8"
              height="16"
              rx="4"
              fill={pantsColor}
              stroke="#1e1e24"
              strokeWidth="2.4"
            />
            {/* Right Sneaker */}
            <path
              d="M 26 14 C 26 13 30 13 34 13 C 38 13 40 16 40 20 C 40 23 37 24 28 24 C 25 24 24 22 25 18 Z"
              fill={shoeColor}
              stroke="#1e1e24"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <line x1="26" y1="21" x2="39" y2="21" stroke="#1e1e24" strokeWidth="1.6" />
          </g>
        </svg>
      </div>

      {/* 5. Name Tag (always upright) */}
      <div className={`${styles.nameTag} ${isCurrentUser ? styles.currentUserTag : ''}`}>
        <span className={styles.onlineDot} />
        {isCurrentUser ? `${displayName} (You)` : displayName}
      </div>
    </div>
  );
});
