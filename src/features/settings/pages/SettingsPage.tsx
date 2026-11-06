import { useState } from 'react';
import type { SettingsSectionId } from '../api/types';
import {
  useSettings,
  useUpdateSection,
  useUnblockUser,
  useChangePassword,
  useTerminateSessions,
  useResetSettings,
  useApplyAppearance,
} from '../api/queries';
import { SettingsNav } from '../components/SettingsNav';
import { MobileSettingsList } from '../components/MobileSettingsList';
import { AccountSection } from '../components/AccountSection';
import { PrivacySection } from '../components/PrivacySection';
import { NotificationsSection } from '../components/NotificationsSection';
import { AppearanceSection } from '../components/AppearanceSection';
import { ChatSettingsSection } from '../components/ChatSettingsSection';
import { BlockedUsersSection } from '../components/BlockedUsersSection';
import { SecuritySection } from '../components/SecuritySection';
import { LogoutModal } from '../components/LogoutModal';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import { Button } from '@/design-system/primitives/Button';
import { Character } from '@/assets/characters/Character';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { showToast } from '@/shared/ui/Toast';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import styles from './SettingsPage.module.css';


export default function SettingsPage() {
  const isDesktopOrTablet = useMediaQuery('(min-width: 768px)');
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account');
  const [mobileDetailSection, setMobileDetailSection] = useState<SettingsSectionId | null>(null);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const { data: settings, isLoading, isError, refetch } = useSettings();
  const updateSectionMutation = useUpdateSection();
  const unblockMutation = useUnblockUser();
  const changePasswordMutation = useChangePassword();
  const terminateSessionsMutation = useTerminateSessions();
  const resetSettingsMutation = useResetSettings();

  // Apply appearance changes dynamically (accent colors, text size, reduced motion, dark mode)
  useApplyAppearance(settings?.appearance);

  const handleSelectSection = (sectionId: SettingsSectionId) => {
    if (sectionId === 'logout') {
      setIsLogoutOpen(true);
      return;
    }
    setActiveSection(sectionId);
    if (!isDesktopOrTablet) {
      setMobileDetailSection(sectionId);
    }
  };

  const handleResetSettings = async () => {
    if (window.confirm('Reset all settings to default cartoon values?')) {
      await resetSettingsMutation.mutateAsync();
      showToast('Settings reset to defaults! 🔄', 'info');
    }
  };

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div className={styles.loadingSkeleton}>
          <div style={{ height: 380, borderRadius: 24, backgroundColor: 'var(--color-bg-surface)', border: '2px solid var(--color-outline)' }} />
          <div style={{ height: 420, borderRadius: 24, backgroundColor: 'var(--color-bg-surface)', border: '2px solid var(--color-outline)' }} />
        </div>
      </main>
    );
  }

  if (isError || !settings) {
    return (
      <main className={styles.pageContainer}>
        <EmptyState
          illustration={
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: '50%',
                backgroundColor: 'var(--color-pastel-pink)',
                border: 'var(--border-width-base) solid var(--color-outline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sticker)',
                margin: '0 auto',
              }}
            >
              <Character base={6} expression="surprised" size={90} />
            </div>
          }
          title="Could not load settings!"
          description="A tiny glitch interrupted loading your settings store. Give it another try!"
          action={
            <Button variant="primary" onClick={() => refetch()}>
              Retry Loading
            </Button>
          }
        />
      </main>
    );
  }

  const renderSectionContent = (sectionId: SettingsSectionId) => {
    switch (sectionId) {
      case 'account':
        return (
          <AccountSection
            settings={settings}
            onUpdate={(data) => updateSectionMutation.mutate({ section: 'account', data })}
          />
        );
      case 'privacy':
        return (
          <PrivacySection
            settings={settings}
            onUpdate={(data) => updateSectionMutation.mutate({ section: 'privacy', data })}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            settings={settings}
            onUpdate={(data) => updateSectionMutation.mutate({ section: 'notifications', data })}
          />
        );
      case 'appearance':
        return (
          <AppearanceSection
            settings={settings}
            onUpdate={(data) => updateSectionMutation.mutate({ section: 'appearance', data })}
          />
        );
      case 'chat':
        return (
          <ChatSettingsSection
            settings={settings}
            onUpdate={(data) => updateSectionMutation.mutate({ section: 'chat', data })}
          />
        );
      case 'blocked':
        return (
          <BlockedUsersSection
            settings={settings}
            onUnblock={(userId) => unblockMutation.mutate(userId)}
            onAddBlockedUser={(newUser) => {
              const updatedBlocked = [
                ...settings.blockedUsers,
                { ...newUser, blockedAt: 'Just now' },
              ];
              updateSectionMutation.mutate({
                section: 'blockedUsers',
                data: updatedBlocked,
              });
            }}
          />
        );
      case 'security':
        return (
          <SecuritySection
            settings={settings}
            onUpdate={(data) => updateSectionMutation.mutate({ section: 'security', data })}
            onChangePassword={(currentPass, newPass) =>
              changePasswordMutation.mutateAsync({ currentPassword: currentPass, newPassword: newPass })
            }
            onTerminateOtherSessions={async () => {
              await terminateSessionsMutation.mutateAsync();
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className={styles.pageContainer}>
      <header className={styles.topBar}>
        <div>
          <h1 className={styles.pageHeading}>ToonChat Settings ⚙️</h1>
          <div className={styles.pageSubtitle}>Personalize your cartoon messaging journey</div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetSettings}
          title="Reset all settings to default"
        >
          <RotateCcw size={14} style={{ marginRight: 6 }} /> Reset Defaults
        </Button>
      </header>

      {/* Desktop / Tablet Split Layout */}
      {isDesktopOrTablet ? (
        <div className={styles.desktopLayout}>
          <SettingsNav
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            blockedCount={settings.blockedUsers.length}
          />
          <section aria-label="Settings section detail">
            {renderSectionContent(activeSection)}
          </section>
        </div>
      ) : (
        /* Mobile Drill-Down Layout */
        <div>
          {mobileDetailSection ? (
            <div>
              <div className={styles.mobileDetailHeader}>
                <button
                  type="button"
                  className={styles.mobileBackButton}
                  onClick={() => setMobileDetailSection(null)}
                >
                  <ArrowLeft size={16} /> All Settings
                </button>
              </div>
              <div>{renderSectionContent(mobileDetailSection)}</div>
            </div>
          ) : (
            <MobileSettingsList
              onSelectSection={handleSelectSection}
              blockedCount={settings.blockedUsers.length}
            />
          )}
        </div>
      )}


      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
      />
    </main>
  );
}
