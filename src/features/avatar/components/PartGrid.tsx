import { memo, useMemo } from 'react';
import type { AvatarConfig } from '../types';
import type { AvatarSubcategory, RenderContext } from '../registry/types';
import { getPartsBySubcategory } from '../registry';
import { Sparkles, Ban } from 'lucide-react';
import styles from './PartGrid.module.css';

interface PartGridProps {
  subcategory: AvatarSubcategory;
  currentConfig: AvatarConfig;
  onSelectPart: (partId: string) => void;
}

export const PartGrid = memo(function PartGrid({
  subcategory,
  currentConfig,
  onSelectPart,
}: PartGridProps) {
  const parts = useMemo(() => getPartsBySubcategory(subcategory), [subcategory]);

  // Current selected part id for this subcategory
  const selectedPartId = (currentConfig as Record<string, unknown>)[subcategory] as string;

  const renderContext: RenderContext = useMemo(
    () => ({
      config: currentConfig,
      expression: 'happy',
      outlineColor: 'var(--color-ink, #1f1b24)',
      strokeWidth: 3.2,
    }),
    [currentConfig]
  );

  return (
    <div
      className={styles.gridContainer}
      role="radiogroup"
      aria-label={`${subcategory} options`}
    >
      {parts.map((part) => {
        const isSelected = selectedPartId === part.id;
        const isNone = part.id === 'none';

        return (
          <button
            key={part.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectPart(part.id)}
            className={`${styles.partTile} ${isSelected ? styles.partTileSelected : ''}`}
            aria-label={part.label}
          >
            {isSelected && (
              <span className={styles.selectedSparkle} aria-hidden="true">
                <Sparkles size={11} />
              </span>
            )}

            <div className={styles.thumbnailWrapper}>
              {isNone ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                  <Ban size={24} />
                </div>
              ) : (
                <svg
                  viewBox="40 20 120 180"
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid meet"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* If the part has a back layer, render it too */}
                  {part.renderBack && part.renderBack(renderContext)}
                  {part.render(renderContext)}
                </svg>
              )}
            </div>

            <span className={styles.partLabel}>{part.label}</span>
          </button>
        );
      })}
    </div>
  );
});
