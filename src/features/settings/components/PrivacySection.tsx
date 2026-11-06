import type { UserSettings } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { ChunkyToggle } from './ChunkyToggle';
import { ChunkyRadioGroup } from './ChunkyRadioGroup';
import { showToast } from '@/shared/ui/Toast';
import styles from './Sections.module.css';

interface PrivacySectionProps {
  settings: UserSettings;
  onUpdate: (data: Partial<UserSettings['privacy']>) => void;
}

export const PrivacySection = ({ settings, onUpdate }: PrivacySectionProps) => {
  const { privacy } = settings;

  const handleUpdate = (partial: Partial<UserSettings['privacy']>) => {
    onUpdate(partial);
    showToast('Privacy preferences updated! 🛡️', 'success');
  };

  return (
    <div>
      <MascotHeader
        title="Privacy & Visibility"
        subtitle="You control who sees your status and who can drop messages in your cartoon inbox."
        mascotBase={4}
        expression="wink"
        backdropColor="var(--color-pastel-pink)"
        badgeText="Safety First"
      />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Direct Messaging Permissions</h3>
        </div>

        <ChunkyRadioGroup<'everyone' | 'friends_of_friends' | 'friends'>
          label="Who can message me directly?"
          description="Control whether new cartoon pals can initiate a private conversation with you."
          value={privacy.whoCanMessage}
          onChange={(val) => handleUpdate({ whoCanMessage: val })}
          options={[
            { value: 'everyone', label: 'Everyone', icon: '🌍' },
            { value: 'friends_of_friends', label: 'Friends of Friends', icon: '👥' },
            { value: 'friends', label: 'Friends Only', icon: '🔒' },
          ]}
        />

        <div className={styles.divider} />

        <div className={styles.cardHeader} style={{ marginTop: 12 }}>
          <h3 className={styles.cardTitle}>Online Status Visibility</h3>
        </div>

        <ChunkyRadioGroup<'everyone' | 'friends' | 'nobody'>
          label="Who can see when you are active?"
          description="Your green online indicator will only show for the people you choose."
          value={privacy.whoCanSeeStatus}
          onChange={(val) => handleUpdate({ whoCanSeeStatus: val })}
          options={[
            { value: 'everyone', label: 'Everyone', icon: '🟢' },
            { value: 'friends', label: 'Friends Only', icon: '🤝' },
            { value: 'nobody', label: 'Nobody (Stealth)', icon: '👻' },
          ]}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Discoverability & Search</h3>
        </div>

        <ChunkyToggle
          label="Find me by email address"
          description="Allow pals with your email address in their contacts to find your profile."
          checked={privacy.findByEmail}
          onChange={(checked) => handleUpdate({ findByEmail: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Find me by phone number"
          description="Allow friends who have your phone number to find you automatically."
          checked={privacy.findByPhone}
          onChange={(checked) => handleUpdate({ findByPhone: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Show reading activity"
          description="Let others know when you have read their messages in direct conversations."
          checked={privacy.showReadingActivity}
          onChange={(checked) => handleUpdate({ showReadingActivity: checked })}
        />
      </div>
    </div>
  );
};
