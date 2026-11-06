import type { UserProfile } from '../api/types';
import { Character } from '@/assets/characters/Character';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { Button } from '@/design-system/primitives/Button';
import { RelationshipActions } from './RelationshipActions';
import { showToast } from '@/shared/ui/Toast';
import { Edit3, Sparkles, Share2, Calendar, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './ProfileHero.module.css';

interface ProfileHeroProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onEditClick: () => void;
  onRelationshipAction: (action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock') => void;
  isRelationshipLoading: boolean;
}

export const ProfileHero = ({
  profile,
  isOwnProfile,
  onEditClick,
  onRelationshipAction,
  isRelationshipLoading,
}: ProfileHeroProps) => {
  const { data: userAvatarConfig } = useAvatarConfig(profile?.id);
  const handleShare = () => {
    const url = window.location.origin + `/profile/${profile.username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Profile link copied to clipboard! 📋', 'success');
      }).catch(() => {
        showToast(`Profile: ${url}`, 'info');
      });
    } else {
      showToast(`Profile: ${url}`, 'info');
    }
  };

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroHeaderBanner} />

      <div className={styles.heroInner}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarRing} style={{ overflow: 'hidden' }}>
            {userAvatarConfig ? (
              <AvatarRenderer
                config={userAvatarConfig}
                size={114}
                expression={profile.status === 'dnd' ? 'sleepy' : profile.status === 'away' ? 'wink' : 'happy'}
              />
            ) : (
              <Character
                base={profile.characterBase}
                size={114}
                expression={profile.status === 'dnd' ? 'sleepy' : profile.status === 'away' ? 'wink' : 'happy'}
              />
            )}
          </div>
          <span
            className={`${styles.statusDot} ${styles[`status-${profile.status}`]}`}
            title={`Status: ${profile.status}`}
          />
        </div>

        <h1 className={styles.displayName}>{profile.displayName}</h1>
        <div className={styles.username}>@{profile.username}</div>

        {profile.vibeText && (
          <div className={styles.statusBubble}>
            <span>{profile.vibeText}</span>
          </div>
        )}

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{profile.friendsCount}</span>
            <span className={styles.statLabel}>Friends</span>
          </div>
          <div style={{ width: 1, height: 28, backgroundColor: 'var(--color-neutral-200)' }} />
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{profile.postsCount}</span>
            <span className={styles.statLabel}>Stories & Posts</span>
          </div>
          {profile.mutualFriends !== undefined && !isOwnProfile && (
            <>
              <div style={{ width: 1, height: 28, backgroundColor: 'var(--color-neutral-200)' }} />
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{profile.mutualFriends}</span>
                <span className={styles.statLabel}>Mutual Pals</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.actionsRow}>
          {isOwnProfile ? (
            <>
              <Button variant="primary" size="md" onClick={onEditClick}>
                <Edit3 size={18} style={{ marginRight: 6 }} />
                Edit Profile
              </Button>
              <Link to="/avatar" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="md">
                  <Sparkles size={18} style={{ marginRight: 6 }} />
                  Customize Avatar
                </Button>
              </Link>
              <Button variant="ghost" size="md" onClick={handleShare} title="Share Profile">
                <Share2 size={18} />
              </Button>
            </>
          ) : (
            <RelationshipActions
              profile={profile}
              onAction={onRelationshipAction}
              isLoading={isRelationshipLoading}
            />
          )}
        </div>

        <div className={styles.extraDetailsRow}>
          <span className={styles.detailPill}>
            <Calendar size={14} /> Joined {profile.joinedAt}
          </span>
          {profile.favoriteReaction && (
            <span className={styles.detailPill}>
              <Smile size={14} /> Fave {profile.favoriteReaction}
            </span>
          )}
          {profile.mood && (
            <span className={styles.detailPill}>
              ✨ Mood: {profile.mood}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
