import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
} from '../api/notificationsService';
import { Bell } from 'lucide-react';
import styles from './NotificationsBell.module.css';

interface NotificationsBellProps {
  size?: number;
  showDropdown?: boolean;
  placement?: 'rail' | 'dropdown';
}

export const NotificationsBell = ({
  size = 26,
  showDropdown = true,
  placement = 'rail',
}: NotificationsBellProps) => {
  const navigate = useNavigate();
  const unreadCount = useUnreadNotificationsCount();
  const { data: notifications } = useNotifications();
  const markReadMutation = useMarkNotificationRead();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadItems = notifications?.filter((n) => !n.read).slice(0, 3) || [];

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleBellClick = () => {
    if (!showDropdown) {
      navigate('/notifications');
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className={styles.bellWrapper} ref={containerRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className={`${styles.bellBtn} ${isOpen ? styles.active : ''}`}
        title={`Notifications (${unreadCount} unread)`}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell size={size} />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Preview */}
      {isOpen && showDropdown && (
        <div
          className={`${styles.popover} ${styles[`placement-${placement}`] || styles['placement-rail']}`}
          role="region"
          aria-label="Notifications preview"
        >
          <div className={styles.popoverHeader}>
            <h4 className={styles.popoverTitle}>Notifications</h4>
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className={styles.viewAllLink}
            >
              View all
            </Link>
          </div>

          <div className={styles.quickList}>
            {unreadItems.length > 0 ? (
              unreadItems.map((item) => (
                <div
                  key={item.id}
                  className={styles.quickItem}
                  onClick={() => {
                    markReadMutation.mutate(item.id);
                    setIsOpen(false);
                    if (item.targetUrl) navigate(item.targetUrl);
                    else navigate('/notifications');
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span style={{ fontSize: 16 }}>🌟</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.actor.displayName}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.content}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#64748b', fontSize: '0.85rem' }}>
                No unread notifications 🎈
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
