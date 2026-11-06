import { forwardRef, useId } from 'react';
import styles from './ChunkyToggle.module.css';

export interface ChunkyToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ChunkyToggle = forwardRef<HTMLInputElement, ChunkyToggleProps>(
  ({ label, description, checked, onChange, disabled }, ref) => {
    const id = useId();

    return (
      <label
        htmlFor={id}
        className={`${styles.container} ${disabled ? styles.disabled : ''}`}
      >
        <div className={styles.textGroup}>
          <span className={styles.label}>{label}</span>
          {description && <span className={styles.description}>{description}</span>}
        </div>

        <div className={`${styles.switchWrapper} ${checked ? styles.checked : ''}`}>
          <input
            id={id}
            ref={ref}
            type="checkbox"
            role="switch"
            aria-checked={checked}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className={styles.nativeCheckbox}
          />
          <span className={styles.track}>
            <span className={styles.thumb} />
          </span>
        </div>
      </label>
    );
  }
);

ChunkyToggle.displayName = 'ChunkyToggle';
