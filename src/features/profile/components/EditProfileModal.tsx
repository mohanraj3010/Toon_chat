import { useEffect } from 'react';
import type { UserProfile } from '../api/types';
import { EditProfileForm } from './EditProfileForm';
import styles from './EditProfileModal.module.css';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
}

export const EditProfileModal = ({
  isOpen,
  onClose,
  profile,
  onSave,
}: EditProfileModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <EditProfileForm
        key={`${profile.username}-${profile.displayName}`}
        profile={profile}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
};
