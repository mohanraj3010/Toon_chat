import { useState } from 'react';
import type { UserProfile } from '../api/types';
import { Button } from '@/design-system/primitives/Button';
import { useNavigate } from 'react-router-dom';
import { UserPlus, MessageCircle, UserCheck, X, ShieldAlert } from 'lucide-react';

interface RelationshipActionsProps {
  profile: UserProfile;
  onAction: (action: 'add' | 'remove' | 'cancel' | 'accept' | 'decline' | 'block' | 'unblock') => void;
  isLoading: boolean;
}

export const RelationshipActions = ({ profile, onAction, isLoading }: RelationshipActionsProps) => {
  const navigate = useNavigate();
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const handleMessage = () => {
    navigate(`/chat/chat-1`); // Connects to direct chat
  };

  if (showConfirmRemove) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Remove {profile.displayName} from friends?
        </span>
        <Button
          variant="danger"
          size="sm"
          disabled={isLoading}
          onClick={() => {
            setShowConfirmRemove(false);
            onAction('remove');
          }}
        >
          Yes, Remove
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirmRemove(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  switch (profile.relationship) {
    case 'friends':
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="primary" size="md" onClick={handleMessage}>
            <MessageCircle size={18} style={{ marginRight: 6 }} />
            Message
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowConfirmRemove(true)}
            disabled={isLoading}
          >
            <UserCheck size={18} style={{ marginRight: 6 }} />
            Friends
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction('block')}
            disabled={isLoading}
            title="Block user"
          >
            <ShieldAlert size={16} />
          </Button>
        </div>
      );

    case 'requested':
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => onAction('cancel')}
            isLoading={isLoading}
          >
            <X size={18} style={{ marginRight: 6 }} />
            Cancel Request
          </Button>
          <Button variant="ghost" size="md" onClick={handleMessage}>
            <MessageCircle size={18} style={{ marginRight: 6 }} />
            Message
          </Button>
        </div>
      );

    case 'pending':
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => onAction('accept')}
            isLoading={isLoading}
          >
            <UserCheck size={18} style={{ marginRight: 6 }} />
            Accept Request
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => onAction('decline')}
            disabled={isLoading}
          >
            Decline
          </Button>
        </div>
      );

    case 'blocked':
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => onAction('unblock')}
            isLoading={isLoading}
          >
            Unblock User
          </Button>
        </div>
      );

    case 'none':
    default:
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => onAction('add')}
            isLoading={isLoading}
          >
            <UserPlus size={18} style={{ marginRight: 6 }} />
            Add Friend
          </Button>
          <Button variant="secondary" size="md" onClick={handleMessage}>
            <MessageCircle size={18} style={{ marginRight: 6 }} />
            Message
          </Button>
        </div>
      );
  }
};
