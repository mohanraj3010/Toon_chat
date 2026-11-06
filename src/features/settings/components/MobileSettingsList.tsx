import type { SettingsSectionId } from '../api/types';
import { SETTINGS_ITEMS } from './settingsNavItems';
import { ChevronRight } from 'lucide-react';
import styles from '../pages/SettingsPage.module.css';

interface MobileSettingsListProps {
  onSelectSection: (sectionId: SettingsSectionId) => void;
  blockedCount: number;
}

export const MobileSettingsList = ({
  onSelectSection,
  blockedCount,
}: MobileSettingsListProps) => {
  return (
    <div className={styles.mobileNavList}>
      {SETTINGS_ITEMS.map((item) => {
        const Icon = item.icon;
        const isLogout = item.id === 'logout';
        return (
          <div
            key={item.id}
            className={styles.mobileNavCard}
            onClick={() => onSelectSection(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectSection(item.id);
            }}
            style={{ borderColor: isLogout ? 'var(--color-danger)' : undefined }}
          >
            <div className={styles.mobileNavCardLeft}>
              <div
                className={styles.mobileIconBox}
                style={{
                  backgroundColor: item.color,
                  color: isLogout ? 'var(--color-danger)' : 'var(--color-text)',
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div
                  className={styles.mobileNavCardTitle}
                  style={{ color: isLogout ? 'var(--color-danger)' : undefined }}
                >
                  {item.label}
                </div>
                <div className={styles.mobileNavCardSubtitle}>
                  {item.id === 'account' && 'Name, email, handle'}
                  {item.id === 'privacy' && 'Who can message & see status'}
                  {item.id === 'notifications' && 'Bells, sounds & popups'}
                  {item.id === 'appearance' && 'Accent color, text size, dark mode'}
                  {item.id === 'chat' && 'Enter to send, stickers, receipts'}
                  {item.id === 'blocked' && `${blockedCount} pals paused`}
                  {item.id === 'security' && 'Passwords & device sessions'}
                  {item.id === 'logout' && 'Sign out of ToonChat'}
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </div>
        );
      })}
    </div>
  );
};
