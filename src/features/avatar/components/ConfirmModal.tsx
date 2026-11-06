import { useRef } from 'react';
import { Button } from '@/design-system/primitives/Button';
import { AlertCircle } from 'lucide-react';
import { useModalA11y } from '@/shared/hooks/useModalA11y';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    isOpen,
    onClose: onCancel,
    containerRef,
  });

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className={styles.modalCard} ref={containerRef} tabIndex={-1}>
        <div className={styles.iconCircle}>
          <AlertCircle size={36} color="#dc2626" />
        </div>

        <h2 id="confirm-modal-title" className={styles.title}>
          {title}
        </h2>

        <p className={styles.description}>{description}</p>

        <div className={styles.btnRow}>
          <Button variant="secondary" size="md" onClick={onCancel} style={{ flex: 1 }}>
            {cancelLabel}
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm} style={{ flex: 1 }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
