import { useState } from 'react';
import { Undo2, Redo2, Dices, RotateCcw, Star, Check } from 'lucide-react';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRandomize: () => void;
  onReset: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export const ActionBar = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRandomize,
  onReset,
  onSave,
  isSaving = false,
}: ActionBarProps) => {
  const [isRolling, setIsRolling] = useState(false);

  const handleRandomize = () => {
    setIsRolling(true);
    onRandomize();
    setTimeout(() => setIsRolling(false), 600);
  };

  return (
    <div className={styles.barContainer} role="toolbar" aria-label="Avatar actions">
      {/* Undo & Redo */}
      <div className={styles.historyGroup}>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
          title="Undo (Ctrl+Z)"
          aria-label="Undo change"
        >
          <Undo2 size={18} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
          title="Redo (Ctrl+Y)"
          aria-label="Redo change"
        >
          <Redo2 size={18} />
        </button>
      </div>

      {/* Center Actions: Randomize & Reset */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleRandomize}
          className={`${styles.actionBtn} ${styles.randomBtn}`}
          title="Generate random cute avatar"
          aria-label="Randomize avatar"
        >
          <Dices size={18} className={isRolling ? styles.rollingDice : ''} />
          <span>Random</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className={`${styles.actionBtn} ${styles.resetBtn}`}
          title="Reset to default avatar"
          aria-label="Reset avatar"
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
      </div>

      {/* Save Action */}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`${styles.actionBtn} ${styles.saveBtn}`}
        title="Save and set as current avatar"
        aria-label="Save avatar"
      >
        {isSaving ? <Check size={18} /> : <Star size={18} fill="#ffffff" />}
        <span>{isSaving ? 'Saved!' : 'Save'}</span>
      </button>
    </div>
  );
};
