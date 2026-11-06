import type { UserSettings } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { Button } from '@/design-system/primitives/Button';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import { Character } from '@/assets/characters/Character';
import { showToast } from '@/shared/ui/Toast';
import { ShieldCheck, Plus } from 'lucide-react';
import styles from './Sections.module.css';

interface BlockedUsersSectionProps {
  settings: UserSettings;
  onUnblock: (userId: string) => void;
  onAddBlockedUser?: (user: { id: string; username: string; displayName: string; characterBase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }) => void;
}

export const BlockedUsersSection = ({
  settings,
  onUnblock,
  onAddBlockedUser,
}: BlockedUsersSectionProps) => {
  const { blockedUsers } = settings;

  const handleUnblock = (id: string, name: string) => {
    onUnblock(id);
    showToast(`Unblocked ${name}! They can message you again ✨`, 'success');
  };

  const handleQuickAddBlocked = () => {
    if (onAddBlockedUser) {
      const demoId = `demo-${Date.now()}`;
      onAddBlockedUser({
        id: demoId,
        username: `noisy_neighbor_${Math.floor(Math.random() * 90 + 10)}`,
        displayName: 'Noisy Neighbor 📢',
        characterBase: 7,
      });
      showToast('Added demo blocked user to list!', 'info');
    }
  };

  return (
    <div>
      <MascotHeader
        title="Blocked Pals"
        subtitle="People you have put on pause. You can unblock them whenever you're ready to reconnect."
        mascotBase={5}
        expression="surprised"
        backdropColor="var(--color-pastel-peach)"
        badgeText="Peace & Quiet"
      />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <ShieldCheck size={20} color="var(--color-brand-500)" />
            Blocked Accounts ({blockedUsers.length})
          </h3>
          {onAddBlockedUser && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleQuickAddBlocked}
              title="Add a sample blocked user to test the list and empty state"
            >
              <Plus size={14} style={{ marginRight: 4 }} /> Add Test User
            </Button>
          )}
        </div>

        {blockedUsers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {blockedUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-bg-base)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-neutral-200)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-neutral-200)',
                      border: 'var(--border-width-sm) solid var(--color-outline)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Character base={user.characterBase} size={42} expression="sleepy" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
                      {user.displayName}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      @{user.username} • Blocked {user.blockedAt}
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUnblock(user.id, user.displayName)}
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 0' }}>
            <EmptyState
              illustration={
                <div
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-pastel-mint)',
                    border: 'var(--border-width-base) solid var(--color-outline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sticker)',
                    margin: '0 auto',
                  }}
                >
                  <Character base={2} expression="happy" size={96} />
                </div>
              }
              title="No blocked pals!"
              description="Everyone's getting along nicely in your cartoon world. No accounts are blocked right now."
              action={
                onAddBlockedUser ? (
                  <Button variant="secondary" size="sm" onClick={handleQuickAddBlocked}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Test Blocking Someone
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
