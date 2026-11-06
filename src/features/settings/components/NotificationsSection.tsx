import type { UserSettings } from '../api/types';
import { MascotHeader } from './MascotHeader';
import { ChunkyToggle } from './ChunkyToggle';
import { showToast } from '@/shared/ui/Toast';
import styles from './Sections.module.css';

interface NotificationsSectionProps {
  settings: UserSettings;
  onUpdate: (data: Partial<UserSettings['notifications']>) => void;
}

export const NotificationsSection = ({ settings, onUpdate }: NotificationsSectionProps) => {
  const { notifications } = settings;

  const handleUpdate = (partial: Partial<UserSettings['notifications']>) => {
    onUpdate(partial);
    showToast('Notification settings saved! 🔔', 'success');
  };

  return (
    <div>
      <MascotHeader
        title="Notification Bells"
        subtitle="Ding, pop, whoosh! Pick which sounds and alerts pop up on your screen."
        mascotBase={7}
        expression="surprised"
        backdropColor="var(--color-pastel-yellow)"
        badgeText="Sounds & Alerts"
      />

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>General Alerts</h3>
        </div>

        <ChunkyToggle
          label="Allow Push Notifications"
          description="Send popup notifications when messages or friends reach out to you."
          checked={notifications.pushEnabled}
          onChange={(checked) => handleUpdate({ pushEnabled: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Cartoon Sound Effects"
          description="Play cheerful pop, boing, and whoosh sounds when messages arrive."
          checked={notifications.soundEffects}
          onChange={(checked) => handleUpdate({ soundEffects: checked })}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Alerts by Activity Type</h3>
        </div>

        <ChunkyToggle
          label="Direct Messages"
          description="Get notified whenever a friend sends you a 1-on-1 message."
          checked={notifications.directMessages}
          disabled={!notifications.pushEnabled}
          onChange={(checked) => handleUpdate({ directMessages: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Group Mentions"
          description="Receive a high-priority alert when someone tags @you in a group chat."
          checked={notifications.groupMentions}
          disabled={!notifications.pushEnabled}
          onChange={(checked) => handleUpdate({ groupMentions: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Friend Requests"
          description="Instant notification when someone adds you as their cartoon buddy."
          checked={notifications.friendRequests}
          disabled={!notifications.pushEnabled}
          onChange={(checked) => handleUpdate({ friendRequests: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Story & Moment Updates"
          description="See when friends post new adventures in Maple Park."
          checked={notifications.storyUpdates}
          disabled={!notifications.pushEnabled}
          onChange={(checked) => handleUpdate({ storyUpdates: checked })}
        />

        <div className={styles.divider} />

        <ChunkyToggle
          label="Reaction & Sticker Alerts"
          description="Notify me when pals react to my messages with stickers or emojis."
          checked={notifications.reactionAlerts}
          disabled={!notifications.pushEnabled}
          onChange={(checked) => handleUpdate({ reactionAlerts: checked })}
        />
      </div>
    </div>
  );
};
