import React from 'react';
import type { WorldPlaceConfig, WorldPlaceId } from '../types';
import styles from './PlaceSwitcher.module.css';

interface PlaceSwitcherProps {
  places: WorldPlaceConfig[];
  currentPlaceId: WorldPlaceId;
  onSelectPlace: (placeId: WorldPlaceId) => void;
  onClose: () => void;
}

const PLACE_ICONS: Record<WorldPlaceId, string> = {
  park: '🌳',
  cafe: '☕',
  plaza: '🎪',
};

export const PlaceSwitcher: React.FC<PlaceSwitcherProps> = ({
  places,
  currentPlaceId,
  onSelectPlace,
  onClose,
}) => {
  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>
            <span>🗺️</span>
            <span>Travel to Another Place</span>
          </h2>
          <button className={styles.btnClose} onClick={onClose} aria-label="Close Travel Map">
            ✕
          </button>
        </div>

        <div className={styles.placesList}>
          {places.map((place) => {
            const isActive = place.id === currentPlaceId;
            return (
              <button
                key={place.id}
                className={`${styles.placeCard} ${isActive ? styles.activeCard : ''}`}
                onClick={() => {
                  onSelectPlace(place.id);
                  onClose();
                }}
                disabled={isActive}
                aria-label={`Travel to ${place.name}: ${place.subtitle}`}
              >
                <div className={styles.placeIconBox}>
                  {PLACE_ICONS[place.id] || '📍'}
                </div>
                <div className={styles.placeDetails}>
                  <div className={styles.placeName}>
                    {place.name}
                    {isActive && <span className={styles.activeBadge}>Here Now</span>}
                  </div>
                  <div className={styles.placeSubtitle}>{place.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
