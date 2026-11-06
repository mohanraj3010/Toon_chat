import { useState } from 'react';
import type { UserSettings } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { Button } from '@/design-system/primitives/Button';
import { Character } from '@/assets/characters/Character';
import { showToast } from '@/shared/ui/Toast';
import { ShieldCheck, Mail, Phone, Calendar, AlertTriangle } from 'lucide-react';
import styles from './Sections.module.css';

interface AccountSectionProps {
  settings: UserSettings;
  onUpdate: (data: Partial<UserSettings['account']>) => void;
}

export const AccountSection = ({ settings, onUpdate }: AccountSectionProps) => {
  const { account } = settings;
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const handleDeactivate = () => {
    setShowDeactivateConfirm(false);
    showToast('Deactivation is disabled in demo mode. Your account is safe! 🛡️', 'info');
  };

  const handleChangePhone = () => {
    const newPhone = window.prompt('Enter your new phone number:', account.phone);
    if (newPhone && newPhone.trim()) {
      onUpdate({ phone: newPhone.trim() });
      showToast('Phone number updated! 📱', 'success');
    }
  };

  return (
    <div>
      <MascotHeader
        title="Account Info"
        subtitle="Keep your cartoon identity fresh, verified, and secure."
        mascotBase={1}
        expression="happy"
        backdropColor="var(--color-pastel-mint)"
        badgeText="Core Settings"
      />

      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--color-pastel-blue)',
              border: 'var(--border-width-base) solid var(--color-outline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sticker)',
            }}
          >
            <Character base={1} size={58} expression="happy" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>
              {account.displayName}
            </h3>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              @{account.username}
            </span>
            <div style={{ marginTop: 4 }}>
              <span className={`${styles.badgePill} ${styles.badgeSuccess}`}>
                <ShieldCheck size={12} /> ToonChat Pioneer 🌟
              </span>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldRow}>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={16} /> Email Address
            </span>
            <span className={styles.fieldSubtext}>{account.email}</span>
          </div>
          <span className={`${styles.badgePill} ${styles.badgeSuccess}`}>
            Verified ✓
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldRow}>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={16} /> Phone Number
            </span>
            <span className={styles.fieldSubtext}>{account.phone}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleChangePhone}>
            Change
          </Button>
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldRow}>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} /> Member Since
            </span>
            <span className={styles.fieldSubtext}>{account.joinedDate}</span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-brand-600)' }}>
            Active Citizen ✨
          </span>
        </div>
      </div>

      <div className={styles.dangerCard}>
        <h3 className={styles.dangerTitle}>
          <AlertTriangle size={20} /> Danger Zone
        </h3>
        <p className={styles.dangerText}>
          Need a break from Maple Park? You can deactivate your account or put your cartoon stickers on hold.
        </p>

        {showDeactivateConfirm ? (
          <div
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-danger)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>
              Are you sure? All your cartoon chats will be paused!
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="danger" size="sm" onClick={handleDeactivate}>
                Yes, Deactivate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeactivateConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="danger" size="sm" onClick={() => setShowDeactivateConfirm(true)}>
              Deactivate Account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
