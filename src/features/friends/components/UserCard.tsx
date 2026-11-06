import { useState, useRef, useEffect } from 'react';
import type { DiscoverUser } from '../api/friendsService';
import { Button } from '@/design-system/primitives/Button';
import { useNavigate } from 'react-router-dom';
import { useCreateConversation } from '@/features/chats/api/useChats';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { Character } from '@/assets/characters/Character';
import styles from './UserCard.module.css';

interface UserCardProps {
  user: DiscoverUser;
  onAddFriend?: (id: string) => Promise<void>;
  onAccept?: (id: string) => Promise<void>;
  onDecline?: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onBlock?: (id: string) => Promise<void>;
  onUnblock?: (id: string) => Promise<void>;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

export const UserCard = ({
  user,
  onAddFriend,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
  onUnblock,
}: UserCardProps) => {
  const navigate = useNavigate();
  const createConversation = useCreateConversation();
  const { data: userAvatarConfig } = useAvatarConfig(user.id);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showConfirm && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [showConfirm]);

  const handleAction = async (
    actionFn: ((id: string) => Promise<void>) | undefined,
    successMessage: string
  ) => {
    if (!actionFn) return;
    setActionState('loading');
    setErrorMsg('');
    try {
      await actionFn(user.id);
      setActionState('success');
      // Toast would go here in a real app, maybe dispatch to a context
      console.log('Toast:', successMessage);
      
      // Auto-reset state if it's not going to unmount immediately
      setTimeout(() => setActionState('idle'), 2000);
    } catch {
      setActionState('error');
      setErrorMsg('Failed. Try again.');
    }
  };

  const handleMessage = async () => {
    try {
      const conv = await createConversation.mutateAsync(user.id);
      navigate(`/chat/${conv.id}`);
    } catch {
      navigate('/');
    }
  };

  const renderActions = () => {
    if (showConfirm) {
      return (
        <div 
          className={styles.actions} 
          ref={confirmRef} 
          tabIndex={-1} 
          style={{ flexDirection: 'column', gap: '4px' }}
          role="dialog"
          aria-label="Confirm remove friend"
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Remove {user.displayName}?</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="danger" size="sm" onClick={() => {
              setShowConfirm(false);
              handleAction(onRemove, 'Friend removed');
            }}>Remove</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
          </div>
        </div>
      );
    }

    if (actionState === 'success') {
      return (
        <div className={styles.actions} style={{ justifyContent: 'center' }}>
          <span style={{ color: '#4ade80', fontWeight: 'bold' }}>Success! ✨</span>
        </div>
      );
    }

    const isLoading = actionState === 'loading';

    switch (user.friendStatus) {
      case 'none':
        return (
          <div className={styles.actions}>
            <Button 
              variant="primary" 
              onClick={() => handleAction(onAddFriend, 'Request sent')} 
              isLoading={isLoading}
            >
              Add Friend
            </Button>
          </div>
        );
      case 'requested':
        return (
          <div className={styles.actions}>
            <Button 
              variant="secondary" 
              onClick={() => handleAction(onCancel, 'Request canceled')} 
              isLoading={isLoading}
            >
              Cancel Request
            </Button>
          </div>
        );
      case 'pending':
        return (
          <div className={styles.actions}>
            <Button 
              variant="primary" 
              onClick={() => handleAction(onAccept, 'Friend added!')} 
              isLoading={isLoading}
            >
              Accept
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => handleAction(onDecline, 'Request declined')} 
              isLoading={isLoading}
            >
              Decline
            </Button>
          </div>
        );
      case 'friends':
        return (
          <div className={styles.actions}>
            <Button variant="primary" onClick={handleMessage}>
              Message
            </Button>
            <Button variant="ghost" onClick={() => setShowConfirm(true)}>
              Remove
            </Button>
          </div>
        );
      case 'blocked':
        return (
          <div className={styles.actions}>
            <Button 
              variant="secondary" 
              onClick={() => handleAction(onUnblock, 'User unblocked')} 
              isLoading={isLoading}
            >
              Unblock
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.card} aria-label={`User card for ${user.displayName}`}>
      <div className={styles.avatarContainer} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {userAvatarConfig ? (
          <AvatarRenderer config={userAvatarConfig} size={56} />
        ) : user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className={styles.avatar} />
        ) : (
          <Character
            base={(user.themeBase as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) || 1}
            size={56}
          />
        )}
        {user.isOnline && <span className={styles.onlineIndicator} title="Online" />}
      </div>
      
      <div className={styles.info}>
        <h3 className={styles.displayName}>{user.displayName}</h3>
        <p className={styles.username}>@{user.username}</p>
        {user.bio && <p className={styles.bio}>{user.bio}</p>}
        
        {user.mutualFriends && user.mutualFriends > 0 ? (
          <div className={styles.mutualFriends}>
            <div className={styles.mutualAvatars}>
              {/* Fake avatars for mutual friends */}
              <div className={styles.mutualAvatar} />
              <div className={styles.mutualAvatar} />
              {user.mutualFriends > 2 && <div className={styles.mutualAvatar} />}
            </div>
            <span>{user.mutualFriends} mutual friends</span>
          </div>
        ) : null}
        
        {user.suggestedReason && (
          <span className={styles.reason}>{user.suggestedReason}</span>
        )}
      </div>

      {renderActions()}
      
      {actionState === 'error' && (
        <div className={styles.errorText} role="alert" aria-live="assertive">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
