import { Character } from '@/assets/characters/Character';
import styles from './MascotHeader.module.css';

interface MascotHeaderProps {
  title: string;
  subtitle: string;
  mascotBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  expression?: 'happy' | 'wink' | 'surprised' | 'sleepy';
  backdropColor?: string;
  badgeText?: string;
}

export const MascotHeader = ({
  title,
  subtitle,
  mascotBase,
  expression = 'happy',
  backdropColor = 'var(--color-pastel-mint)',
  badgeText,
}: MascotHeaderProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.mascotWrapper} style={{ backgroundColor: backdropColor }}>
        <Character base={mascotBase} expression={expression} size={58} />
      </div>

      <div className={styles.textGroup}>
        {badgeText && <span className={styles.badge}>{badgeText}</span>}
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </div>
  );
};
