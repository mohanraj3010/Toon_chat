import React from 'react';
import type { WorldCharacterState, WorldPlaceId } from '../types';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import styles from './WorldLanding.module.css';

interface WorldLandingProps {
  characters: WorldCharacterState[];
  onEnter: (placeId: WorldPlaceId) => void;
  onBackToChat: () => void;
}

export const WorldLanding: React.FC<WorldLandingProps> = ({
  characters,
  onEnter,
  onBackToChat,
}) => {
  const friendsInPark = characters.filter((c) => !c.isCurrentUser);

  return (
    <div className={styles.landingContainer}>
      <div className={styles.entranceCard}>
        {/* World Pill Tag */}
        <div className={styles.worldTag}>
          <span>🌳</span>
          <span>TOONCHAT WORLD</span>
        </div>

        {/* Title & Tagline */}
        <h1 className={styles.title}>Welcome to Maple Park</h1>
        <p className={styles.subtitle}>
          Step outside the chat room into a living cartoon park! Meet friends along stone paths,
          wave hello, grab boba at Cozy Café, or relax by the duck pond.
        </p>

        {/* Friends in the Park Now live roster */}
        <div className={styles.rosterSection}>
          <div className={styles.rosterHeader}>
            <span className={styles.liveDot} />
            <span>Friends in the park right now ({friendsInPark.length})</span>
          </div>

          <div className={styles.friendsGrid}>
            {friendsInPark.slice(0, 6).map((friend) => (
              <div key={friend.id} className={styles.friendChip}>
                <div className={styles.avatarThumb}>
                  <AvatarRenderer config={friend.avatarConfig} size={36} />
                </div>
                <div className={styles.friendInfo}>
                  <span className={styles.friendName}>{friend.displayName}</span>
                  <span className={styles.friendLocation}>{friend.statusText}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action buttons */}
        <div className={styles.buttonGroup}>
          <button
            className={styles.btnEnter}
            onClick={() => onEnter('park')}
            aria-label="Enter Maple Park"
          >
            <span>Enter Maple Park</span>
            <span>🌳✨</span>
          </button>

          <div className={styles.placesRow}>
            <button
              className={styles.btnPlaceSecondary}
              onClick={() => onEnter('cafe')}
              title="Visit Cozy Café"
            >
              ☕ Cozy Café
            </button>
            <button
              className={styles.btnPlaceSecondary}
              onClick={() => onEnter('plaza')}
              title="Visit Town Plaza"
            >
              🎪 Town Plaza
            </button>
          </div>

          <button
            className={styles.btnBackToChat}
            onClick={onBackToChat}
            aria-label="Return to Direct Chats"
          >
            ← Back to Direct Chats
          </button>
        </div>
      </div>
    </div>
  );
};
