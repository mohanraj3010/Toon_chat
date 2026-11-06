import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { cn } from '@/shared/lib/utils';
import { Avatar } from '@/design-system/primitives';
import { MessageCircle, Users, UsersRound, Globe, User, Settings, Sparkles, Flame, Bell, Compass } from 'lucide-react';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell';
import { useUnreadNotificationsCount } from '@/features/notifications/api/notificationsService';
import { useAuth } from '@/features/auth/context/useAuth';
import styles from './AppShell.module.css';

interface NavRailProps {
  avatarConfig?: ReturnType<typeof useAvatarConfig>['data'];
  initials: string;
}

const DesktopShell = ({ avatarConfig, initials }: NavRailProps) => (
  <div className={styles['shell-container']}>
    <nav className={styles.rail} aria-label="Desktop primary navigation">
      <div style={{ marginBottom: 'auto', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <NavLink
          to="/"
          title="Chats"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <MessageCircle size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/world"
          title="Toon World (Maple Park)"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Compass size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/stories"
          title="Toon Stories"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Flame size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/groups"
          title="Squads & Groups"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <UsersRound size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/friends"
          title="Friends"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Users size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/discover"
          title="Discover"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Globe size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/avatar"
          title="Avatar Creator"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Sparkles size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <NotificationsBell size={26} placement="rail" />
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Settings size={26} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/profile"
          title="My Profile"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {avatarConfig ? (
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-brand-400)' }}>
              <AvatarRenderer config={avatarConfig} size={32} />
            </div>
          ) : (
            <Avatar size="sm" initials={initials} />
          )}
        </NavLink>
      </div>
    </nav>
    <main className={styles['shell-content']}>
      <Outlet />
    </main>
  </div>
);

const TabletShell = ({ avatarConfig, initials }: NavRailProps) => (
  <div className={styles['shell-container']}>
    <nav className={styles.rail} aria-label="Tablet primary navigation">
      <div style={{ marginBottom: 'auto', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <NavLink
          to="/"
          title="Chats"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <MessageCircle size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/world"
          title="Toon World (Maple Park)"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Compass size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/stories"
          title="Toon Stories"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Flame size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/groups"
          title="Squads & Groups"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <UsersRound size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/friends"
          title="Friends"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Users size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/discover"
          title="Discover"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Globe size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/avatar"
          title="Avatar Creator"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Sparkles size={30} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <NotificationsBell size={26} placement="rail" />
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {({ isActive }) => (
            <Settings size={26} color={isActive ? "var(--color-brand-500)" : "var(--color-text-muted)"} />
          )}
        </NavLink>
        <NavLink
          to="/profile"
          title="My Profile"
          className={({ isActive }) => cn(styles['nav-icon'], isActive && styles.active)}
        >
          {avatarConfig ? (
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-brand-400)' }}>
              <AvatarRenderer config={avatarConfig} size={32} />
            </div>
          ) : (
            <Avatar size="sm" initials={initials} />
          )}
        </NavLink>
      </div>
    </nav>
    <main className={styles['shell-content']}>
      <Outlet />
    </main>
  </div>
);

const MobileShell = () => {
  const unreadCount = useUnreadNotificationsCount();
  const location = useLocation();
  const isWorld = location.pathname.startsWith('/world');
  const isChat = location.pathname.startsWith('/chat/');
  const hideBottomNav = isWorld || isChat;

  return (
    <div className={styles['shell-container']} style={{ flexDirection: 'column' }}>
      <main
        className={styles['shell-content']}
        style={{ paddingBottom: hideBottomNav ? 0 : 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Outlet />
      </main>
      {!hideBottomNav && (
        <nav className={styles['bottom-nav']} aria-label="Mobile bottom navigation">
          <NavLink to="/" aria-label="Chats" className={({ isActive }) => cn(styles['nav-item'], isActive && styles.active)}>
            <MessageCircle size={24} />
          </NavLink>
          <NavLink to="/world" aria-label="Toon World" className={({ isActive }) => cn(styles['nav-item'], isActive && styles.active)}>
            <Compass size={24} />
          </NavLink>
          <NavLink to="/stories" aria-label="Stories" className={({ isActive }) => cn(styles['nav-item'], isActive && styles.active)}>
            <Flame size={24} />
          </NavLink>
          <NavLink to="/friends" aria-label="Friends" className={({ isActive }) => cn(styles['nav-item'], isActive && styles.active)}>
            <Users size={24} />
          </NavLink>
          <NavLink
            to="/notifications"
            aria-label="Notifications"
            className={({ isActive }) => cn(styles['nav-item'], isActive && styles.active)}
            style={{ position: 'relative' }}
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 14,
                  background: 'var(--color-brand-500, #f97316)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 15,
                  height: 15,
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #fff',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" aria-label="Profile" className={({ isActive }) => cn(styles['nav-item'], isActive && styles.active)}>
            <User size={24} />
          </NavLink>
        </nav>
      )}
    </div>
  );
};

export const AppShell = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const { data: avatarConfig } = useAvatarConfig();
  const { user } = useAuth();
  const initials = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();

  if (isDesktop) return <DesktopShell avatarConfig={avatarConfig} initials={initials} />;
  if (isTablet) return <TabletShell avatarConfig={avatarConfig} initials={initials} />;
  return <MobileShell />;
};


