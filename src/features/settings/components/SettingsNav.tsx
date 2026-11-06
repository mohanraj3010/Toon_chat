import type { SettingsSectionId } from '../api/types';
import { SETTINGS_ITEMS } from './settingsNavItems';
import styles from './SettingsNav.module.css';

interface SettingsNavProps {
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  blockedCount: number;
}


export const SettingsNav = ({
  activeSection,
  onSelectSection,
  blockedCount,
}: SettingsNavProps) => {
  return (
    <nav className={styles.navContainer} aria-label="Settings categories">
      <div className={styles.navTitle}>
        <span>Settings ⚙️</span>
      </div>

      {SETTINGS_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        const isLogout = item.id === 'logout';

        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.navItem} ${isActive ? styles.active : ''} ${
              isLogout ? styles.logoutItem : ''
            }`}
            onClick={() => onSelectSection(item.id)}
          >
            <div className={styles.navItemLeft}>
              <div
                className={styles.iconWrapper}
                style={{ backgroundColor: isActive ? undefined : item.color }}
              >
                <Icon size={18} />
              </div>
              <span>{item.label}</span>
            </div>

            {item.id === 'blocked' && blockedCount > 0 && (
              <span className={styles.badge}>{blockedCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
