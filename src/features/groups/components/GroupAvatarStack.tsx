import { memo } from 'react';
import type { GroupMember } from '../types';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import styles from './GroupAvatarStack.module.css';

interface GroupAvatarStackProps {
  members: GroupMember[];
  max?: number;
  size?: number;
}

export const GroupAvatarStack = memo(function GroupAvatarStack({
  members,
  max = 3,
  size = 28,
}: GroupAvatarStackProps) {
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className={styles.stack} aria-label={`${members.length} members in group`}>
      {visible.map((member) => (
        <div
          key={member.id}
          className={styles.avatarRing}
          style={{ width: size, height: size }}
          title={member.displayName}
        >
          {member.avatarConfig ? (
            <AvatarRenderer config={member.avatarConfig} size={size} />
          ) : (
            <Character
              base={(member.themeBase || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
              size={size}
            />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={styles.countBadge}
          style={{
            width: size,
            height: size,
            fontSize: Math.max(10, Math.round(size * 0.38)),
          }}
          title={`${remaining} more members`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
});
