import { useState, useRef, useEffect } from 'react';
import type { AvatarConfig, AvatarExpression } from '../types';
import { AvatarRenderer } from './AvatarRenderer';
import { Edit2, Check } from 'lucide-react';
import styles from './AvatarStage.module.css';

interface AvatarStageProps {
  config: AvatarConfig;
  onUpdateConfig: (partial: Partial<AvatarConfig>) => void;
  size?: number;
}

const EXPRESSIONS: { id: AvatarExpression; emoji: string; label: string }[] = [
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'wink', emoji: '😉', label: 'Wink' },
  { id: 'surprised', emoji: '😲', label: 'Surprised' },
  { id: 'cool', emoji: '😎', label: 'Cool' },
  { id: 'sleepy', emoji: '😴', label: 'Sleepy' },
  { id: 'laughing', emoji: '😆', label: 'Laughing' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
];

export const AvatarStage = ({ config, onUpdateConfig, size }: AvatarStageProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = () => {
    setNameInput(config.name || 'Luna');
    setIsEditingName(true);
  };

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = () => {
    setIsEditingName(false);
    const trimmed = nameInput.trim() || 'Luna';
    onUpdateConfig({ name: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  return (
    <div className={styles.stageContainer}>
      {/* Visual stage card with character preview */}
      <div className={styles.stageCard}>
        <div className={styles.pedestalAura} />
        
        {/* Floating sparkles */}
        <span className={styles.sparkleParticle} style={{ top: 20, left: 30 }}>✨</span>
        <span className={styles.sparkleParticle} style={{ top: 35, right: 35, animationDelay: '1s' }}>⭐</span>
        <span className={styles.sparkleParticle} style={{ bottom: 45, left: 24, animationDelay: '1.8s' }}>🌸</span>
        <span className={styles.sparkleParticle} style={{ bottom: 35, right: 28, animationDelay: '2.4s' }}>✨</span>

        <AvatarRenderer
          config={config}
          size={size || '100%'}
          animated={true}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Character Name Capsule */}
      <div className={styles.nameBadge}>
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={nameInput}
            maxLength={18}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className={styles.nameInput}
            aria-label="Avatar name"
          />
        ) : (
          <span className={styles.nameText}>{config.name || 'Luna'}</span>
        )}

        <button
          type="button"
          onClick={() => (isEditingName ? handleSaveName() : handleStartEditing())}
          className={styles.editNameBtn}
          title={isEditingName ? 'Done' : 'Edit character name'}
          aria-label={isEditingName ? 'Save name' : 'Edit name'}
        >
          {isEditingName ? <Check size={16} /> : <Edit2 size={15} />}
        </button>
      </div>

      {/* Expression Preview Strip */}
      <div className={styles.expressionStrip} role="radiogroup" aria-label="Avatar expression">
        {EXPRESSIONS.map((expr) => {
          const isSelected = config.expression === expr.id;
          return (
            <button
              key={expr.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.expressionBtn} ${isSelected ? styles.expressionBtnActive : ''}`}
              onClick={() => onUpdateConfig({ expression: expr.id })}
              title={`${expr.label} Expression`}
              aria-label={`${expr.label} Expression`}
            >
              <span aria-hidden="true">{expr.emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
