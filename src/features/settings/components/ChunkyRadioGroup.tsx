import styles from './ChunkyRadioGroup.module.css';

interface ChunkyOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface ChunkyRadioGroupProps<T extends string> {
  label: string;
  description?: string;
  options: ChunkyOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function ChunkyRadioGroup<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: ChunkyRadioGroupProps<T>) {
  return (
    <div className={styles.container} role="radiogroup" aria-label={label}>
      <span className={styles.label}>{label}</span>
      {description && <span className={styles.description}>{description}</span>}

      <div className={styles.optionsRow}>
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.optionButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.icon && <span>{opt.icon}</span>}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
