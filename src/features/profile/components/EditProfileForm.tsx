import { useState, useRef } from 'react';
import type { UserProfile, UserStatus } from '../api/types';
import { EditProfileSchema } from '../api/types';
import { Button } from '@/design-system/primitives/Button';
import { Input } from '@/design-system/primitives/Input';
import { Character } from '@/assets/characters/Character';
import { X, AlertCircle } from 'lucide-react';
import styles from './EditProfileModal.module.css';

interface EditProfileFormProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
}

const statusOptions: { value: UserStatus; label: string; dotColor: string }[] = [
  { value: 'online', label: 'Online', dotColor: 'var(--color-success)' },
  { value: 'away', label: 'Away', dotColor: 'var(--color-warn)' },
  { value: 'dnd', label: 'Busy (DND)', dotColor: 'var(--color-danger)' },
  { value: 'offline', label: 'Offline', dotColor: 'var(--color-neutral-300)' },
];

export const EditProfileForm = ({
  profile,
  onClose,
  onSave,
}: EditProfileFormProps) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || '');
  const [status, setStatus] = useState<UserStatus>(profile.status);
  const [vibeText, setVibeText] = useState(profile.vibeText || '');
  const [characterBase, setCharacterBase] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(
    profile.characterBase
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const validate = () => {
    const result = EditProfileSchema.safeParse({
      displayName,
      username,
      bio,
      status,
      vibeText,
      characterBase,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        status,
        vibeText: vibeText.trim(),
        characterBase,
      });
      onClose();
    } catch {
      setErrors({ form: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalContent} ref={modalRef}>
      <div className={styles.sheetHandle} />

      <div className={styles.header}>
        <h2 id="edit-profile-title" className={styles.title}>
          Edit Cartoon Profile
        </h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <div className={styles.body}>
          {errors.form && (
            <div className={styles.errorMessage} role="alert">
              <AlertCircle size={16} />
              {errors.form}
            </div>
          )}

          {/* Character Base Selector */}
          <div className={styles.formGroup}>
            <span className={styles.label}>Pick Avatar Cartoon Style</span>
            <div className={styles.avatarPickerRow}>
              {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((baseNum) => (
                <button
                  key={baseNum}
                  type="button"
                  className={`${styles.avatarOption} ${
                    characterBase === baseNum ? styles.avatarOptionSelected : ''
                  }`}
                  onClick={() => setCharacterBase(baseNum)}
                  aria-label={`Select avatar style ${baseNum}`}
                >
                  <Character base={baseNum} size={48} expression="happy" />
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="edit-displayName" className={styles.label}>
                Display Name
              </label>
              <span
                className={`${styles.counter} ${
                  displayName.length >= 30 ? styles.counterLimit : ''
                }`}
              >
                {displayName.length}/30
              </span>
            </div>
            <Input
              id="edit-displayName"
              value={displayName}
              maxLength={30}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: '' }));
                }
              }}
              className={errors.displayName ? styles.inputError : ''}
              placeholder="e.g. Luna Star"
            />
            {errors.displayName && (
              <span className={styles.errorMessage} role="alert">
                <AlertCircle size={14} /> {errors.displayName}
              </span>
            )}
          </div>

          {/* Username */}
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="edit-username" className={styles.label}>
                Username (@handle)
              </label>
              <span
                className={`${styles.counter} ${
                  username.length >= 20 ? styles.counterLimit : ''
                }`}
              >
                {username.length}/20
              </span>
            </div>
            <Input
              id="edit-username"
              value={username}
              maxLength={20}
              onChange={(e) => {
                setUsername(e.target.value.replace(/^@/, ''));
                if (errors.username) {
                  setErrors((prev) => ({ ...prev, username: '' }));
                }
              }}
              className={errors.username ? styles.inputError : ''}
              placeholder="e.g. luna_star"
            />
            {errors.username && (
              <span className={styles.errorMessage} role="alert">
                <AlertCircle size={14} /> {errors.username}
              </span>
            )}
          </div>

          {/* Status Pills */}
          <div className={styles.formGroup}>
            <span className={styles.label}>Status Indicator</span>
            <div className={styles.statusPills}>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.statusPill} ${
                    status === opt.value ? styles.statusPillSelected : ''
                  }`}
                  onClick={() => setStatus(opt.value)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: opt.dotColor,
                      display: 'inline-block',
                    }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Bubble / Vibe Text */}
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="edit-vibeText" className={styles.label}>
                Status Bubble (Vibe)
              </label>
              <span
                className={`${styles.counter} ${
                  vibeText.length >= 50 ? styles.counterLimit : ''
                }`}
              >
                {vibeText.length}/50
              </span>
            </div>
            <Input
              id="edit-vibeText"
              value={vibeText}
              maxLength={50}
              onChange={(e) => {
                setVibeText(e.target.value);
                if (errors.vibeText) {
                  setErrors((prev) => ({ ...prev, vibeText: '' }));
                }
              }}
              className={errors.vibeText ? styles.inputError : ''}
              placeholder="e.g. Code • Build • Grow 🚀"
            />
            {errors.vibeText && (
              <span className={styles.errorMessage} role="alert">
                <AlertCircle size={14} /> {errors.vibeText}
              </span>
            )}
          </div>

          {/* Bio */}
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="edit-bio" className={styles.label}>
                Bio
              </label>
              <span
                className={`${styles.counter} ${
                  bio.length >= 160 ? styles.counterLimit : ''
                }`}
              >
                {bio.length}/160
              </span>
            </div>
            <textarea
              id="edit-bio"
              className={`${styles.textarea} ${errors.bio ? styles.inputError : ''}`}
              value={bio}
              maxLength={160}
              rows={3}
              onChange={(e) => {
                setBio(e.target.value);
                if (errors.bio) {
                  setErrors((prev) => ({ ...prev, bio: '' }));
                }
              }}
              placeholder="Tell the cartoon world about yourself..."
            />
            {errors.bio && (
              <span className={styles.errorMessage} role="alert">
                <AlertCircle size={14} /> {errors.bio}
              </span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
          >
            Save Profile ✨
          </Button>
        </div>
      </form>
    </div>
  );
};
