import { useState, useEffect } from 'react';
import { useDiscoverUsers, useFriendMutations } from '../api/queries';
import { UserCard } from '../components/UserCard';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import { Button } from '@/design-system/primitives/Button';
import { Input } from '@/design-system/primitives/Input';

const AVAILABLE_INTERESTS = ['Gaming', 'Music', 'Art', 'Coding', 'Movies', 'Anime', 'Photography', 'Travel', 'Food', 'Fitness'];

export const DiscoverList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const { data: users = [], isLoading } = useDiscoverUsers(debouncedSearch, selectedInterests);
  const mutations = useFriendMutations();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const getEmptyStateIllustration = () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="50" fill="#38bdf8" stroke="#1a1a1a" strokeWidth="4"/>
      <path d="M40 50C40 44.4772 44.4772 40 50 40C55.5228 40 60 44.4772 60 50C60 55.5228 55.5228 60 50 60C44.4772 60 40 55.5228 40 50Z" fill="white" stroke="#1a1a1a" strokeWidth="4"/>
      <path d="M60 50C60 44.4772 64.4772 40 70 40C75.5228 40 80 44.4772 80 50C80 55.5228 75.5228 60 70 60C64.4772 60 60 55.5228 60 50Z" fill="white" stroke="#1a1a1a" strokeWidth="4"/>
      <circle cx="50" cy="50" r="16" fill="black" fillOpacity="0.1"/>
      <circle cx="70" cy="50" r="16" fill="black" fillOpacity="0.1"/>
      <circle cx="50" cy="50" r="4" fill="#1a1a1a"/>
      <circle cx="70" cy="50" r="4" fill="#1a1a1a"/>
      <path d="M55 70H65" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: '"Fredoka", sans-serif', marginBottom: '24px' }}>Discover</h1>
      
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input 
          type="text" 
          placeholder="Search by name or @username..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {AVAILABLE_INTERESTS.map(interest => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <Button
                key={interest}
                variant={isSelected ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => toggleInterest(interest)}
                style={{ 
                  borderRadius: '16px', 
                  border: isSelected ? '2px solid #1a1a1a' : '2px dashed #ccc',
                  padding: '4px 12px'
                }}
              >
                {interest}
              </Button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
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
      ) : users.length === 0 ? (
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
          <EmptyState 
            illustration={getEmptyStateIllustration()}
            title="No one found!"
            description="We couldn't find anyone matching your search or filters. Try removing some to see more people."
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
              onAddFriend={async (id) => await mutations.sendRequest.mutateAsync(id)}
              onCancel={async (id) => await mutations.cancelRequest.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
