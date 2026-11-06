import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupItem } from '../types';
import { CURRENT_USER_ID } from '../api/groupsService';
import { GroupAvatarView } from './GroupAvatarView';
import { GroupAvatarStack } from './GroupAvatarStack';
import { Lock, Globe } from 'lucide-react';
import styles from './GroupCard.module.css';

interface GroupCardProps {
  group: GroupItem;
  onJoin: (groupId: string) => void;
  onRequestJoin?: (groupId: string) => void;
}

export const GroupCard = memo(function GroupCard({
  group,
  onJoin,
  onRequestJoin,
}: GroupCardProps) {
  const navigate = useNavigate();
  const isMember = group.members.some((m) => m.id === CURRENT_USER_ID);
  const hasRequested = group.joinRequests?.some((r) => r.user.id === CURRENT_USER_ID);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember) {
      navigate(`/chat/${group.conversationId}`);
    } else if (group.privacy === 'public') {
      onJoin(group.id);
    } else if (onRequestJoin) {
      onRequestJoin(group.id);
    }
  };

  return (
    <div
      className={styles.card}
      onClick={() => isMember && navigate(`/chat/${group.conversationId}`)}
      role="article"
      aria-label={`Group ${group.name}`}
    >
      {/* Banner */}
      <div className={styles.banner} style={{ backgroundColor: group.bannerColor || '#ffedd5' }}>
        <div className={styles.avatarPosition}>
          <GroupAvatarView avatar={group.avatar} size={50} />
        </div>
        <span className={styles.categoryBadge}>
          {group.category.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.groupName}>{group.name}</h3>
          <span className={styles.privacyBadge}>
            {group.privacy === 'private' ? <Lock size={13} /> : <Globe size={13} />}
            <span>{group.privacy === 'private' ? 'Private' : 'Public'}</span>
          </span>
        </div>

        <p className={styles.description}>{group.description || 'Welcome to our ToonChat squad!'}</p>

        {/* Footer with Avatar Stack & Action */}
        <div className={styles.footer}>
          <GroupAvatarStack members={group.members} max={3} size={28} />

          {isMember ? (
            <button type="button" onClick={handleAction} className={styles.openBtn}>
              Open Chat
            </button>
          ) : group.privacy === 'public' ? (
            <button type="button" onClick={handleAction} className={styles.joinBtn}>
              Join Squad
            </button>
          ) : (
            <button
              type="button"
              disabled={hasRequested}
              onClick={handleAction}
              className={styles.joinBtn}
              style={{ opacity: hasRequested ? 0.6 : 1 }}
            >
              {hasRequested ? 'Requested' : 'Request Join'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
