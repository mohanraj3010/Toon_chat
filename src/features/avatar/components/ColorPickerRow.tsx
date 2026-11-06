import { memo } from 'react';
import type { ColorSlot } from '../registry/types';
import { Check } from 'lucide-react';
import styles from './ColorPickerRow.module.css';

interface ColorPickerRowProps {
  colorSlot: ColorSlot;
  currentColor: string;
  onSelectColor: (color: string) => void;
}

export const ColorPickerRow = memo(function ColorPickerRow({
  colorSlot,
  currentColor,
  onSelectColor,
}: ColorPickerRowProps) {
  const currentOption = colorSlot.palette.find(
    (c) => c.value.toLowerCase() === currentColor.toLowerCase()
  );

  return (
    <div className={styles.container} role="radiogroup" aria-label={`${colorSlot.label} color palette`}>
      <div className={styles.headerRow}>
        <span className={styles.label}>{colorSlot.label}</span>
        {currentOption && (
          <span className={styles.selectedName}>{currentOption.name}</span>
        )}
      </div>

      <div className={styles.swatchRow}>
        {colorSlot.palette.map((color) => {
          const isSelected = color.value.toLowerCase() === currentColor.toLowerCase();
          return (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${color.name} (${color.value})`}
              title={`${color.name} (${color.value})`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectColor(color.value)}
              className={`${styles.swatchBtn} ${isSelected ? styles.swatchBtnSelected : ''}`}
              style={{ backgroundColor: color.value }}
            >
              {isSelected && <Check size={16} className={styles.checkMark} />}
            </button>
          );
        })}
      </div>
    </div>
  );
});
