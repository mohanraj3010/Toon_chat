import { useState } from 'react';
import type { UserSettings } from '../api/types';
import { PasswordChangeSchema } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { Button } from '@/design-system/primitives/Button';
import { Input } from '@/design-system/primitives/Input';
import { ChunkyToggle } from './ChunkyToggle';
import { showToast } from '@/shared/ui/Toast';
import { KeyRound, Smartphone, Laptop, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './Sections.module.css';

interface SecuritySectionProps {
  settings: UserSettings;
  onUpdate: (data: Partial<UserSettings['security']>) => void;
  onChangePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  onTerminateOtherSessions: () => Promise<void>;
}

export const SecuritySection = ({
  settings,
  onUpdate,
  onChangePassword,
  onTerminateOtherSessions,
}: SecuritySectionProps) => {
  const { security } = settings;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = PasswordChangeSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
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
      return;
    }

    setErrors({});
    setIsChangingPass(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      showToast('Password changed successfully! 🔒✨', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not change password.';
      setErrors({ form: message });
      showToast(message, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSignOutOthers = async () => {
    setIsSigningOutOthers(true);
    try {
      await onTerminateOtherSessions();
      showToast('Signed out of all other active sessions! 🚪', 'success');
    } catch {
      showToast('Failed to sign out other sessions.', 'error');
    } finally {
      setIsSigningOutOthers(false);
    }
  };

  const hasOtherSessions = security.activeSessions.some((s) => !s.isCurrent);

  return (
    <div>
      <MascotHeader
        title="Account Security"
        subtitle="Keep your cartoon passwords locked tight and monitor which gadgets are signed in."
        mascotBase={8}
        expression="happy"
        backdropColor="var(--color-pastel-mint)"
        badgeText="Fort Knox"
      />

      {/* Password Change Form */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <KeyRound size={20} color="var(--color-brand-500)" />
            Change Password
          </h3>
        </div>

        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errors.form && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--color-danger)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'bold',
              }}
              role="alert"
            >
              <AlertCircle size={14} /> {errors.form}
            </div>
          )}

          <div>
            <label
              htmlFor="current-password"
              style={{
                display: 'block',
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              Current Password
            </label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: '' }));
              }}
              placeholder="Enter current password"
            />
            {errors.currentPassword && (
              <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 'bold' }}>
                {errors.currentPassword}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="new-password"
              style={{
                display: 'block',
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              New Password (min 8 chars)
            </label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              placeholder="At least 8 characters"
            />
            {errors.newPassword && (
              <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 'bold' }}>
                {errors.newPassword}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              style={{
                display: 'block',
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              Confirm New Password
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              placeholder="Re-type new password"
            />
            {errors.confirmPassword && (
              <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 'bold' }}>
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <Button variant="primary" size="md" type="submit" isLoading={isChangingPass}>
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Two-Factor Authentication (2FA)</h3>
        </div>

        <ChunkyToggle
          label="Require 2FA verification code"
          description="Send an authenticator prompt whenever signing in from a new cartoon device."
          checked={security.twoFactorEnabled}
          onChange={(checked) => {
            onUpdate({ twoFactorEnabled: checked });
            showToast(checked ? '2FA enabled! 🛡️' : '2FA disabled.', 'info');
          }}
        />
      </div>

      {/* Active Sessions */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Active Signed-in Sessions</h3>
          {hasOtherSessions && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleSignOutOthers}
              isLoading={isSigningOutOthers}
            >
              <LogOut size={14} style={{ marginRight: 4 }} /> Sign Out Other Sessions
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {security.activeSessions.map((session) => (
            <div
              key={session.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: session.isCurrent ? 'var(--color-brand-100)' : 'var(--color-bg-base)',
                border: session.isCurrent
                  ? 'var(--border-width-base) solid var(--color-brand-500)'
                  : '1px solid var(--color-neutral-200)',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-outline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {session.device.toLowerCase().includes('phone') ? (
                    <Smartphone size={20} color="var(--color-brand-600)" />
                  ) : (
                    <Laptop size={20} color="var(--color-brand-600)" />
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {session.device}
                    {session.isCurrent && (
                      <span className={`${styles.badgePill} ${styles.badgeSuccess}`} style={{ fontSize: '10px' }}>
                        <CheckCircle2 size={10} /> This Device
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {session.browser} • {session.location} • {session.lastActive}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
