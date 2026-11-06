import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './primitives.module.css';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, initials, size = 'md', isOnline, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.avatar, styles[`avatar-${size}`], className)}
        {...props}
      >
        {src ? (
          <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : children ? (
          children
        ) : (
          <span style={{ fontWeight: 'bold' }}>{initials}</span>
        )}
        {isOnline && <span className={styles['avatar-online-dot']} />}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
