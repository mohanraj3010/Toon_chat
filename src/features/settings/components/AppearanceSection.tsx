import type { UserSettings, AccentColor, TextSize } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { ChunkyToggle } from './ChunkyToggle';
import { showToast } from '@/shared/ui/Toast';
import { Check } from 'lucide-react';
import styles from './Sections.module.css';

interface AppearanceSectionProps {
  settings: UserSettings;
  onUpdate: (data: Partial<UserSettings['appearance']>) => void;
}

const ACCENT_COLORS: { id: AccentColor; name: string; hex: string; bgSoft: string }[] = [
  { id: 'blue', name: 'Sky Blue', hex: '#0ea5e9', bgSoft: '#e0f2fe' },
  { id: 'mint', name: 'Fresh Mint', hex: '#10b981', bgSoft: '#d1fae5' },
  { id: 'pink', name: 'Bubblegum', hex: '#ec4899', bgSoft: '#fce7f3' },
  { id: 'honey', name: 'Warm Honey', hex: '#f59e0b', bgSoft: '#fef3c7' },
  { id: 'purple', name: 'Grape Pop', hex: '#8b5cf6', bgSoft: '#ede9fe' },
];

const TEXT_SIZES: { id: TextSize; name: string; sample: string }[] = [
  { id: 'small', name: 'Compact', sample: '14px' },
  { id: 'medium', name: 'Default', sample: '16px' },
  { id: 'large', name: 'Chunky', sample: '18px' },
];

export const AppearanceSection = ({ settings, onUpdate }: AppearanceSectionProps) => {
  const { appearance } = settings;

  const handleUpdate = (partial: Partial<UserSettings['appearance']>) => {
    onUpdate(partial);
    showToast('Appearance updated! 🎨', 'success');
  };

  return (
    <div>
      <MascotHeader
        title="Appearance & Vibes"
        subtitle="Style your cartoon messaging world with colorful palettes and cozy modes."
        mascotBase={6}
        expression="happy"
        backdropColor="var(--color-pastel-lavender)"
        badgeText="Visual Style"
      />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Cartoon Accent Color</h3>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Choose your primary theme color used for buttons, badges, bubbles, and highlights.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {ACCENT_COLORS.map((accent) => {
            const isSelected = appearance.accentColor === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => handleUpdate({ accentColor: accent.id })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-xl)',
                  border: isSelected
                    ? 'var(--border-width-base) solid var(--color-outline)'
                    : 'var(--border-width-sm) solid var(--color-neutral-200)',
                  backgroundColor: isSelected ? accent.bgSoft : 'var(--color-bg-base)',
                  boxShadow: isSelected ? 'var(--shadow-sticker)' : 'none',
                  cursor: 'pointer',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  transition: 'all var(--motion-duration-fast) var(--motion-easing-bounce)',
                  minWidth: 80,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: accent.hex,
                    border: '2px solid var(--color-outline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  {isSelected && <Check size={18} strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'bold',
                    color: 'var(--color-text)',
                  }}
                >
                  {accent.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Reading Font Scale</h3>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TEXT_SIZES.map((size) => {
            const isSelected = appearance.textSize === size.id;
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => handleUpdate({ textSize: size.id })}
                style={{
                  flex: 1,
                  minWidth: 100,
                  minHeight: 48,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-xl)',
                  border: isSelected
                    ? 'var(--border-width-base) solid var(--color-outline)'
                    : 'var(--border-width-sm) solid var(--color-neutral-200)',
                  backgroundColor: isSelected ? 'var(--color-brand-500)' : 'var(--color-bg-base)',
                  color: isSelected ? 'var(--color-text-inverted)' : 'var(--color-text)',
                  boxShadow: isSelected ? '2px 2px 0px 0px var(--color-ink)' : 'none',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all var(--motion-duration-fast)',
                }}
              >
                <span>{size.name}</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>{size.sample}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Accessibility & Comfort</h3>
        </div>

        <ChunkyToggle
          label="Reduce Motion & Animations"
          description="Dampens bouncy cartoon spring animations for users sensitive to fast transitions."
          checked={appearance.reduceMotion}
          onChange={(checked) => handleUpdate({ reduceMotion: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Cozy Dark Mode"
          description="Softer on your eyes during late-night cartoon chats."
          checked={appearance.darkMode}
          onChange={(checked) => handleUpdate({ darkMode: checked })}
        />
      </div>
    </div>
  );
};
