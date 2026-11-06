import { useState, useMemo } from 'react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useHandleFriendNotification,
} from '../api/notificationsService';
import { NotificationItem } from './NotificationItem';
import { Character } from '@/assets/characters/Character';
import { CheckCheck } from 'lucide-react';
import styles from './NotificationsList.module.css';

type FilterType = 'all' | 'unread' | 'requests';

export const NotificationsList = () => {
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();
  const friendActionMutation = useHandleFriendNotification();

  const [filter, setFilter] = useState<FilterType>('all');

  const filteredItems = useMemo(() => {
    if (!notifications) return [];
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    if (filter === 'requests') return notifications.filter((n) => n.type === 'friend_request');
    return notifications;
  }, [notifications, filter]);

  const [now] = useState(() => Date.now());

  // Group into "Today" (within 24h) and "Earlier"
  const { todayItems, earlierItems } = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const today: typeof filteredItems = [];
    const earlier: typeof filteredItems = [];

    filteredItems.forEach((item) => {
      const itemTime = new Date(item.timestamp).getTime();
      if (now - itemTime < oneDay) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { todayItems: today, earlierItems: earlier };
  }, [filteredItems, now]);

  const hasUnread = notifications?.some((n) => !n.read);

  if (isLoading) {
    return (
      <div className={styles.listContainer}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.emptyState}>
        <Character base={5} expression="surprised" size={100} />
        <h3 className={styles.emptyTitle}>Could not load notifications</h3>
        <button
          type="button"
          onClick={() => refetch()}
          className={styles.markAllBtn}
          style={{ marginTop: 12 }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.listContainer} aria-live="polite">
      {/* Top Controls: Filter Tabs + Mark All Read */}
      <div className={styles.topBar}>
        <div className={styles.filterTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          >
            All ({notifications?.length || 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'unread'}
            onClick={() => setFilter('unread')}
            className={`${styles.filterTab} ${filter === 'unread' ? styles.active : ''}`}
          >
            Unread ({notifications?.filter((n) => !n.read).length || 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'requests'}
            onClick={() => setFilter('requests')}
            className={`${styles.filterTab} ${filter === 'requests' ? styles.active : ''}`}
          >
            Friend Requests
          </button>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            className={styles.markAllBtn}
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Character base={3} expression="wink" size={110} />
          <h3 className={styles.emptyTitle}>All caught up! 🎉</h3>
          <p className={styles.emptyText}>
            No new notifications here. Go say hi to a friend or post a cartoon story!
          </p>
        </div>
      ) : (
        <>
          {/* Today Group */}
          {todayItems.length > 0 && (
            <section className={styles.groupSection} aria-label="Today's notifications">
              <h3 className={styles.groupTitle}>🌟 Today</h3>
              {todayItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={item}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onFriendAction={(id, action) => friendActionMutation.mutate({ id, action })}
                />
              ))}
            </section>
          )}

          {/* Earlier Group */}
          {earlierItems.length > 0 && (
            <section className={styles.groupSection} aria-label="Earlier notifications">
              <h3 className={styles.groupTitle}>🗓️ Earlier</h3>
              {earlierItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={item}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onFriendAction={(id, action) => friendActionMutation.mutate({ id, action })}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
};
