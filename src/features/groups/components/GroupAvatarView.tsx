import { memo } from 'react';
import type { GroupAvatar } from '../types';
import styles from './GroupAvatarView.module.css';

interface GroupAvatarViewProps {
  avatar: GroupAvatar;
  size?: number;
}

export const GroupAvatarView = memo(function GroupAvatarView({
  avatar,
  size = 54,
}: GroupAvatarViewProps) {
  const patternClass = styles[`pattern-${avatar.pattern || 'dots'}`] || styles['pattern-dots'];

  return (
    <div
      className={`${styles.avatarBox} ${patternClass}`}
      style={{
        width: size,
        height: size,
        backgroundColor: avatar.backgroundColor || '#ffedd5',
        borderRadius: Math.round(size * 0.36),
      }}
      aria-label={`Group emblem: ${avatar.emblem}`}
    >
      <span
        className={styles.emblem}
        style={{ fontSize: Math.round(size * 0.52) }}
      >
        {avatar.emblem}
      </span>
    </div>
  );
});
