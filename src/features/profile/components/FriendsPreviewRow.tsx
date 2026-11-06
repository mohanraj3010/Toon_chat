import type { ProfileFriendPreview } from '../api/types';
import { Character } from '@/assets/characters/Character';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import styles from './FriendsPreviewRow.module.css';

interface FriendsPreviewRowProps {
  friends: ProfileFriendPreview[];
  totalFriendsCount: number;
}

export const FriendsPreviewRow = ({ friends, totalFriendsCount }: FriendsPreviewRowProps) => {
  if (friends.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Users size={20} color="var(--color-brand-500)" />
          Friends ({totalFriendsCount})
        </h2>
        <Link to="/friends" className={styles.seeAllLink}>
          See all friends →
        </Link>
      </div>

      <div className={styles.friendsRow}>
        {friends.map((friend) => (
          <Link
            key={friend.id}
            to={`/profile/${friend.username}`}
            className={styles.friendCard}
          >
            <div className={styles.avatarWrapper}>
              <div className={styles.friendAvatar}>
                <Character base={friend.characterBase} size={44} expression="happy" />
              </div>
              {friend.isOnline && <span className={styles.onlineDot} />}
            </div>
            <span className={styles.friendName}>{friend.displayName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
