import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUserProfile, useUpdateProfile, useRelationshipMutation, useCurrentProfile } from '../api/queries';
import type { UserProfile } from '../api/types';
import { ProfileHero } from '../components/ProfileHero';
import { FriendsPreviewRow } from '../components/FriendsPreviewRow';
import { StoriesPostsGrid } from '../components/StoriesPostsGrid';
import { EditProfileModal } from '../components/EditProfileModal';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import { Button } from '@/design-system/primitives/Button';
import { Character } from '@/assets/characters/Character';
import { showToast } from '@/shared/ui/Toast';
import { ArrowLeft, Settings, AlertTriangle } from 'lucide-react';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: currentMe } = useCurrentProfile();
  const { data: profile, isLoading, isError, refetch } = useUserProfile(username);
  const updateProfileMutation = useUpdateProfile();
  const relationshipMutation = useRelationshipMutation();

  const isOwnProfile =
    !username ||
    username.toLowerCase() === 'me' ||
    Boolean(currentMe && profile && currentMe.username.toLowerCase() === profile.username.toLowerCase());

  const handleSaveProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      await updateProfileMutation.mutateAsync(updatedData);
      showToast('Profile updated successfully! 🎉', 'success');
    } catch {
      showToast('Could not save profile changes.', 'error');
      throw new Error('Save failed');
    }
  };

  const handleRelationshipAction = async (
    action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock'
  ) => {
    if (!profile) return;
    try {
      await relationshipMutation.mutateAsync({
        username: profile.username,
        action,
      });

      const messageMap: Record<string, string> = {
        add: 'Friend request sent! 💌',
        remove: 'Friend removed.',
        cancel: 'Friend request canceled.',
        accept: 'Friend request accepted! 🎉',
        decline: 'Request declined.',
        block: `${profile.displayName} blocked.`,
        unblock: `${profile.displayName} unblocked! ✨`,
      };
      showToast(messageMap[action] || 'Action completed!', 'success');
    } catch {
      showToast('Action failed. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div className={styles.loadingSkeleton}>
          <div className={styles.skeletonCircle} />
          <div className={styles.skeletonTextLg} />
          <div className={styles.skeletonTextSm} />
          <div style={{ width: '80%', height: 40, borderRadius: 12, backgroundColor: 'var(--color-neutral-100)' }} />
        </div>
      </main>
    );
  }

  if (isError || !profile) {
    return (
      <main className={styles.pageContainer}>
        <div style={{ marginTop: '2rem' }}>
          <EmptyState
            illustration={
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-pastel-peach)',
                  border: 'var(--border-width-base) solid var(--color-outline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sticker)',
                  margin: '0 auto',
                }}
              >
                <Character base={6} expression="surprised" size={100} />
              </div>
            }
            title="Cartoon User Not Found!"
            description={
              username
                ? `We couldn't find anyone with the handle @${username}. Maybe they wandered into another part of Maple Park!`
                : 'Could not load your profile.'
            }
            action={
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => navigate('/profile')}>
                  My Profile
                </Button>
                <Button variant="secondary" onClick={() => refetch()}>
                  <AlertTriangle size={16} style={{ marginRight: 6 }} /> Retry
                </Button>
              </div>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pageContainer}>
      <header className={styles.topBar}>
        {username && username !== currentMe?.username ? (
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} /> Back
          </button>
        ) : (
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'bold', fontSize: 'var(--text-lg)' }}>
            ToonChat Profile 🌟
          </div>
        )}

        <div className={styles.topBarActions}>
          <Link to="/settings" className={styles.settingsLink} title="Settings">
            <Settings size={16} />
            <span>Settings</span>
          </Link>
        </div>
      </header>

      <ProfileHero
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEditClick={() => setIsEditOpen(true)}
        onRelationshipAction={handleRelationshipAction}
        isRelationshipLoading={relationshipMutation.isPending}
      />

      <FriendsPreviewRow
        friends={profile.friendsPreview}
        totalFriendsCount={profile.friendsCount}
      />

      <StoriesPostsGrid
        posts={profile.posts}
        isOwnProfile={isOwnProfile}
      />

      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />
    </main>
  );
}
