import { NotificationsList } from '../components/NotificationsList';
import { Bell } from 'lucide-react';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Bell size={28} color="var(--color-brand-500)" />
          <span>Notifications</span>
        </h1>
      </header>

      <main>
        <NotificationsList />
      </main>
    </div>
  );
}
