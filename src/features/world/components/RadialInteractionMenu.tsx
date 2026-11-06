import React, { useEffect, useRef } from 'react';
import type { WorldCharacterState } from '../types';
import styles from './RadialInteractionMenu.module.css';

interface RadialInteractionMenuProps {
  character: WorldCharacterState;
  position: { x: number; y: number };
  onWave: (character: WorldCharacterState) => void;
  onChat: (character: WorldCharacterState) => void;
  onProfile: (character: WorldCharacterState) => void;
  onEmote: (character: WorldCharacterState) => void;
  onClose: () => void;
}

export const RadialInteractionMenu: React.FC<RadialInteractionMenuProps> = ({
  character,
  position,
  onWave,
  onChat,
  onProfile,
  onEmote,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        className={styles.radialContainer}
        style={{
          left: `${position.x}px`,
          top: `${position.y - 20}px`,
        }}
        role="dialog"
        aria-label={`Interactions with ${character.displayName}`}
      >
        <div className={styles.centerInfo}>
          {character.displayName}
        </div>

        {/* 1. Wave Button (Top) */}
        <button
          className={`${styles.radialButton} ${styles.btnWave}`}
          onClick={(e) => {
            e.stopPropagation();
            onWave(character);
            onClose();
          }}
          title={`Wave to ${character.displayName}`}
          aria-label={`Wave to ${character.displayName}`}
        >
          👋
          <span className={styles.tooltipLabel}>Wave</span>
        </button>

        {/* 2. Chat Button (Right) */}
        <button
          className={`${styles.radialButton} ${styles.btnChat}`}
          onClick={(e) => {
            e.stopPropagation();
            onChat(character);
            onClose();
          }}
          title={`Chat with ${character.displayName}`}
          aria-label={`Chat with ${character.displayName}`}
        >
          💬
          <span className={styles.tooltipLabel}>Chat</span>
        </button>

        {/* 3. View Profile Button (Bottom) */}
        <button
          className={`${styles.radialButton} ${styles.btnProfile}`}
          onClick={(e) => {
            e.stopPropagation();
            onProfile(character);
            onClose();
          }}
          title={`View ${character.displayName}'s profile`}
          aria-label={`View ${character.displayName}'s profile`}
        >
          👤
          <span className={styles.tooltipLabel}>Profile</span>
        </button>

        {/* 4. Emote React Button (Left) */}
        <button
          className={`${styles.radialButton} ${styles.btnEmote}`}
          onClick={(e) => {
            e.stopPropagation();
            onEmote(character);
          }}
          title={`Send reaction to ${character.displayName}`}
          aria-label={`Send reaction to ${character.displayName}`}
        >
          ✨
          <span className={styles.tooltipLabel}>React</span>
        </button>
      </div>
    </>
  );
};
