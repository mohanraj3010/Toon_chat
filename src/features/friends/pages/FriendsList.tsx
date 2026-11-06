import { useState } from 'react';
import { 
  useFriends, 
  useOnlineFriends, 
  useFriendRequests, 
  useSentRequests, 
  useBlockedUsers,
  useFriendMutations
} from '../api/queries';
import { UserCard } from '../components/UserCard';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import { Button } from '@/design-system/primitives/Button';
import { realFriendsService } from '../api/realFriendsService';

type Tab = 'all' | 'online' | 'requests' | 'sent' | 'blocked';

export const FriendsList = () => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  
  const allFriendsQuery = useFriends();
  const onlineFriendsQuery = useOnlineFriends();
  const requestsQuery = useFriendRequests();
  const sentQuery = useSentRequests();
  const blockedQuery = useBlockedUsers();

  const mutations = useFriendMutations();

  // Test mode: fail simulation
  const [failMode, setFailMode] = useState(false);
  const toggleFail = () => {
    const newMode = !failMode;
    setFailMode(newMode);
    realFriendsService.setShouldFail(newMode);
  };

  const getQuery = () => {
    switch (activeTab) {
      case 'all': return allFriendsQuery;
      case 'online': return onlineFriendsQuery;
      case 'requests': return requestsQuery;
      case 'sent': return sentQuery;
      case 'blocked': return blockedQuery;
    }
  };

  const query = getQuery();
  const isLoading = query.isLoading;
  const users = query.data || [];

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
      {(['all', 'online', 'requests', 'sent', 'blocked'] as Tab[]).map((tab) => (
        <Button
          key={tab}
          variant={activeTab === tab ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveTab(tab)}
          style={{ textTransform: 'capitalize' }}
        >
          {tab}
        </Button>
      ))}
      <div style={{ marginLeft: 'auto' }}>
        <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={failMode} onChange={toggleFail} />
          Simulate API Failure
        </label>
      </div>
    </div>
  );

  const getEmptyStateCopy = () => {
    switch (activeTab) {
      case 'all': return "You don't have any friends yet! Go to Discover to find some.";
      case 'online': return "None of your friends are online right now. It's quiet... too quiet.";
      case 'requests': return "No requests yet - your inbox is as quiet as a sleeping cat.";
      case 'sent': return "You haven't sent any friend requests. Don't be shy!";
      case 'blocked': return "You haven't blocked anyone. Peace and harmony!";
    }
  };

  const getEmptyStateIllustration = () => {
    // Unique original character placeholder for empty states
    const color = activeTab === 'requests' ? '#fde047' : '#a78bfa';
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="50" fill={color} stroke="#1a1a1a" strokeWidth="4"/>
        <path d="M40 50C40 44.4772 44.4772 40 50 40C55.5228 40 60 44.4772 60 50C60 55.5228 55.5228 60 50 60C44.4772 60 40 55.5228 40 50Z" fill="white" stroke="#1a1a1a" strokeWidth="4"/>
        <path d="M60 50C60 44.4772 64.4772 40 70 40C75.5228 40 80 44.4772 80 50C80 55.5228 75.5228 60 70 60C64.4772 60 60 55.5228 60 50Z" fill="white" stroke="#1a1a1a" strokeWidth="4"/>
        <circle cx="48" cy="50" r="4" fill="#1a1a1a"/>
        <circle cx="68" cy="50" r="4" fill="#1a1a1a"/>
        <path d="M50 75Q60 85 70 75" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontFamily: '"Fredoka", sans-serif' }}>Friends</h1>
        {renderTabs()}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 16px',
                backgroundColor: 'var(--color-bg-surface, #ffffff)',
                border: '2px solid var(--color-outline, #1a1a1a)',
                borderRadius: '24px',
                boxShadow: '0 4px 0 var(--color-outline, #1a1a1a)',
                gap: '12px',
                height: '310px',
                boxSizing: 'border-box',
              }}
            >
              <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: '80%', height: 28, borderRadius: 8, marginTop: 4 }} />
              <div className="skeleton" style={{ width: '90%', height: 38, borderRadius: 16, marginTop: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: '"Fredoka", sans-serif' }}>Friends</h1>
      {renderTabs()}
      
      {users.length === 0 ? (
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
          <EmptyState 
            illustration={getEmptyStateIllustration()}
            title="It's empty here!"
            description={getEmptyStateCopy()}
          />
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '24px' 
        }}>
          {users.map(user => (
            <UserCard 
              key={user.id} 
              user={user}
              onAccept={async (id) => await mutations.acceptRequest.mutateAsync(id)}
              onDecline={async (id) => await mutations.declineRequest.mutateAsync(id)}
              onCancel={async (id) => await mutations.cancelRequest.mutateAsync(id)}
              onRemove={async (id) => await mutations.removeFriend.mutateAsync(id)}
              onBlock={async (id) => await mutations.blockUser.mutateAsync(id)}
              onUnblock={async (id) => await mutations.unblockUser.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
