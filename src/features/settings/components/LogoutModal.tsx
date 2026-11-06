import { useRef } from 'react';
import { Character } from '@/assets/characters/Character';
import { Button } from '@/design-system/primitives/Button';
import { useNavigate } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/context/useAuth';
import { useModalA11y } from '@/shared/hooks/useModalA11y';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoutModal = ({ isOpen, onClose }: LogoutModalProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    isOpen,
    onClose,
    containerRef,
  });

  if (!isOpen) return null;

  const handleConfirmLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(30, 30, 36, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 'var(--z-modal, 300)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 150ms ease-out',
        overscrollBehavior: 'contain',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: 'var(--border-width-base) solid var(--color-outline)',
          boxShadow: 'var(--shadow-cartoon-interactive)',
          width: '100%',
          maxWidth: '420px',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: '50%',
            color: 'var(--color-text-muted)',
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            backgroundColor: 'var(--color-pastel-pink)',
            border: 'var(--border-width-base) solid var(--color-outline)',
            boxShadow: 'var(--shadow-sticker)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          <Character base={2} expression="sleepy" size={90} />
        </div>

        <h2
          id="logout-title"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-2xl)',
            margin: '0 0 8px 0',
            color: 'var(--color-text)',
          }}
        >
          Leaving already? 🥺
        </h2>

        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            margin: '0 0 24px 0',
            maxWidth: 320,
          }}
        >
          Your cartoon pals and stickers will be waiting right here when you return!
        </p>

        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
            Stay in ToonChat
          </Button>
          <Button variant="danger" size="md" onClick={handleConfirmLogout} style={{ flex: 1 }}>
            <LogOut size={16} style={{ marginRight: 6 }} />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};
