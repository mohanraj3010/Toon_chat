import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Star, Clock } from 'lucide-react';
import {
  ALL_STICKERS,
  STICKER_PACKS,
  STICKERS_MAP,
  type StickerData,
  type StickerPackId,
} from '@/assets/stickers';
import styles from './StickerPicker.module.css';

interface Props {
  onSelect: (id: string) => void;
  onClose: () => void;
}

const STORAGE_KEY_RECENTS = 'toonchat_recent_stickers';
const STORAGE_KEY_FAVORITES = 'toonchat_favorite_stickers';
const MAX_RECENTS = 16;

function loadStoredIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredIds(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage might be disabled in private mode
  }
}

export const StickerPicker = ({ onSelect, onClose }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(() => loadStoredIds(STORAGE_KEY_RECENTS));
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadStoredIds(STORAGE_KEY_FAVORITES));
  const [activeTab, setActiveTab] = useState<StickerPackId | 'recents' | 'favorites'>(() => {
    const recents = loadStoredIds(STORAGE_KEY_RECENTS);
    return recents.length > 0 ? 'recents' : 'classic-toons';
  });

  // Close on Escape & Outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Toggle Favorite
  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [id, ...prev];
      saveStoredIds(STORAGE_KEY_FAVORITES, updated);
      return updated;
    });
  }, []);

  // Handle Selection
  const handleSelect = useCallback(
    (stickerId: string) => {
      // Add to recents
      const updatedRecents = [stickerId, ...recentIds.filter((id) => id !== stickerId)].slice(
        0,
        MAX_RECENTS
      );
      setRecentIds(updatedRecents);
      saveStoredIds(STORAGE_KEY_RECENTS, updatedRecents);

      onSelect(stickerId);
      onClose();
    },
    [onSelect, onClose, recentIds]
  );

  // Filtered Stickers
  const displayedStickers = useMemo<StickerData[]>(() => {
    const trimmed = searchQuery.trim().toLowerCase();

    if (trimmed) {
      return ALL_STICKERS.filter(
        (s) =>
          s.name.toLowerCase().includes(trimmed) ||
          s.tags.some((tag) => tag.toLowerCase().includes(trimmed))
      );
    }

    if (activeTab === 'recents') {
      return recentIds
        .map((id) => STICKERS_MAP[id])
        .filter((s): s is StickerData => Boolean(s));
    }

    if (activeTab === 'favorites') {
      return favoriteIds
        .map((id) => STICKERS_MAP[id])
        .filter((s): s is StickerData => Boolean(s));
    }

    return ALL_STICKERS.filter((s) => s.packId === activeTab);
  }, [searchQuery, activeTab, recentIds, favoriteIds]);

  return (
    <div
      ref={containerRef}
      className={styles['picker-container']}
      role="dialog"
      aria-label="Cartoon Sticker Picker"
    >
      {/* Search Input */}
      <div className={styles['search-bar']}>
        <Search size={16} color="var(--color-text-muted, #94a3b8)" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stickers by name or mood..."
          className={styles['search-input']}
          aria-label="Search stickers"
        />
        {searchQuery && (
          <button
            type="button"
            className={styles['clear-search-btn']}
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      {!searchQuery && (
        <div className={styles['tabs-bar']} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recents'}
            className={`${styles['tab-btn']} ${activeTab === 'recents' ? styles['tab-btn-active'] : ''}`}
            onClick={() => setActiveTab('recents')}
            title="Recent Stickers"
          >
            <Clock size={14} />
            <span>Recents</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={`${styles['tab-btn']} ${activeTab === 'favorites' ? styles['tab-btn-active'] : ''}`}
            onClick={() => setActiveTab('favorites')}
            title="Favorite Stickers"
          >
            <Star size={14} />
            <span>Favorites</span>
          </button>

          {STICKER_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              role="tab"
              aria-selected={activeTab === pack.id}
              className={`${styles['tab-btn']} ${activeTab === pack.id ? styles['tab-btn-active'] : ''}`}
              onClick={() => setActiveTab(pack.id)}
              title={pack.name}
            >
              <span>{pack.icon}</span>
              <span>{pack.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Stickers Grid */}
      <div className={styles['stickers-scroll-area']}>
        {displayedStickers.length === 0 ? (
          <div className={styles['empty-state']}>
            <div className={styles['empty-icon']}>
              {searchQuery ? '🔍' : activeTab === 'recents' ? '🕒' : activeTab === 'favorites' ? '⭐' : '🎨'}
            </div>
            <div className={styles['empty-title']}>
              {searchQuery
                ? `No stickers matching "${searchQuery}"`
                : activeTab === 'recents'
                  ? 'No recent stickers yet'
                  : activeTab === 'favorites'
                    ? 'No favorite stickers yet'
                    : 'No stickers in this pack'}
            </div>
            <div className={styles['empty-desc']}>
              {searchQuery
                ? 'Try searching for smile, party, cat, boom, or coffee!'
                : activeTab === 'recents'
                  ? 'Pick any cartoon sticker below to start your collection!'
                  : activeTab === 'favorites'
                    ? 'Click the star on any sticker to add it to your favorites!'
                    : 'Check out the other packs!'}
            </div>
          </div>
        ) : (
          <div className={styles['stickers-grid']}>
            {displayedStickers.map((sticker) => {
              const Comp = sticker.Component;
              const isFav = favoriteIds.includes(sticker.id);

              return (
                <div
                  key={sticker.id}
                  className={styles['sticker-item']}
                  onClick={() => handleSelect(sticker.id)}
                  title={`${sticker.name} (${sticker.tags.join(', ')})`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(sticker.id);
                    }
                  }}
                >
                  <button
                    type="button"
                    className={`${styles['favorite-star-btn']} ${isFav ? styles['favorite-star-btn-active'] : ''}`}
                    onClick={(e) => toggleFavorite(sticker.id, e)}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    aria-label={isFav ? `Unfavorite ${sticker.name}` : `Favorite ${sticker.name}`}
                  >
                    <Star size={11} fill={isFav ? '#eab308' : 'none'} color={isFav ? '#ca8a04' : '#64748b'} />
                  </button>
                  <div className={styles['sticker-preview']}>
                    <Comp width={54} height={54} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
