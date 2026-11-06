import React, { useState } from 'react';
import type { WorldPlaceConfig, WorldCharacterState } from '../types';
import styles from './MiniMap.module.css';

interface MiniMapProps {
  sceneConfig: WorldPlaceConfig;
  characters: WorldCharacterState[];
}

export const MiniMap: React.FC<MiniMapProps> = ({ sceneConfig, characters }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Map 1000x600 scene to 100% of minimap (170x110)
  const normX = (x: number) => `${(x / 1000) * 100}%`;
  const normY = (y: number) => `${(y / 600) * 100}%`;

  return (
    <div className={styles.miniMapWrapper}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Hide Mini-Map' : 'Show Mini-Map'}
      >
        <span>🗺️</span>
        <span>{isOpen ? 'Close Map' : 'Mini-Map'}</span>
      </button>

      {isOpen && (
        <div className={styles.mapCard}>
          <div className={styles.mapCanvas}>
            {/* Hotspots */}
            {sceneConfig.hotspots.map((hs) => (
              <div
                key={hs.id}
                className={styles.hotspotDot}
                style={{
                  left: normX(hs.position.x),
                  top: normY(hs.position.y),
                }}
                title={hs.name}
              />
            ))}

            {/* Characters */}
            {characters.map((char) =>
              char.isCurrentUser ? (
                <div
                  key={char.id}
                  className={styles.playerDot}
                  style={{
                    left: normX(char.position.x),
                    top: normY(char.position.y),
                  }}
                  title="You"
                />
              ) : (
                <div
                  key={char.id}
                  className={styles.friendDot}
                  style={{
                    left: normX(char.position.x),
                    top: normY(char.position.y),
                  }}
                  title={char.displayName}
                />
              )
            )}

            <div className={styles.legend}>
              ● You  ● Friends
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
