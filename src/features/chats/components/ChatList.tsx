import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversations } from '../api/useChats';
import { ChatRow } from './ChatRow';
import { StoryRow } from './StoryRow';
import { NewChatModal } from './NewChatModal';
import { Input, Avatar, Button, EmptyState } from '@/design-system/primitives';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { IllustrationError, IllustrationEmptyInbox } from '@/assets/illustrations/EmptyStates';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAuth } from '@/features/auth/context/useAuth';
import { Edit, Search } from 'lucide-react';
import styles from './Chats.module.css';
import { cn } from '@/shared/lib/utils';

type Filter = 'All' | 'Unread' | 'Friends' | 'Groups';

export const ChatList = () => {
  const { data: chats, isLoading, isError, error, refetch } = useConversations();
  const { data: userAvatarConfig } = useAvatarConfig();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<Filter>('All');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const { id: selectedId } = useParams();
  const navigate = useNavigate();

  const filteredChats = useMemo(() => {
    if (!chats) return [];

    let result = chats;

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.title && c.title.toLowerCase().includes(lower)) ||
          c.participants.some(
            (p) =>
              p.displayName.toLowerCase().includes(lower) ||
              p.username.toLowerCase().includes(lower)
          )
      );
    }

    if (filter === 'Unread') {
      result = result.filter((c) => c.unreadCount > 0);
    } else if (filter === 'Groups') {
      result = result.filter((c) => c.type === 'group');
    } else if (filter === 'Friends') {
      result = result.filter((c) => c.type === 'direct');
    }

    // Sort pinned first, then by updated date
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.updatedAt).getTime() || 0;
      const timeB = new Date(b.updatedAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [chats, debouncedSearch, filter]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '40%', height: 16 }} />
                <div className="skeleton" style={{ width: '70%', height: 14 }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <EmptyState
          illustration={<IllustrationError style={{ transform: 'scale(0.8)' }} />}
          title="Couldn't load chats"
          description={error?.message || "Check your database connection and try again."}
          action={
            <Button onClick={() => refetch()} variant="secondary">
              Retry
            </Button>
          }
        />
      );
    }

    if (filteredChats.length === 0) {
      if (filter === 'Groups') {
        return (
          <EmptyState
            illustration={<IllustrationEmptyInbox style={{ transform: 'scale(0.8)' }} />}
            title="No squads yet"
            description="Join an existing cartoon squad or create one with your friends!"
            action={<Button onClick={() => navigate('/groups')}>Explore Squads</Button>}
          />
        );
      }
      return (
        <EmptyState
          illustration={<IllustrationEmptyInbox style={{ transform: 'scale(0.8)' }} />}
          title="No chats found"
          description={
            debouncedSearch
              ? `No results for "${debouncedSearch}"`
              : "You don't have any messages yet."
          }
          action={
            !debouncedSearch ? (
              <Button onClick={() => setIsNewChatOpen(true)} variant="primary">
                Start a chat
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <div className={styles['chat-list']} role="list">
        {filteredChats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            isSelected={selectedId === chat.id}
            onClick={() => navigate(`/chat/${chat.id}`)}
          />
        ))}
      </div>
    );
  };

  const userInitial =
    user?.displayName?.[0]?.toUpperCase() ||
    user?.username?.[0]?.toUpperCase() ||
    'T';

  return (
    <div className={styles['home-sidebar']}>
      {/* Header */}
      <div className={styles['chat-header']}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {userAvatarConfig ? (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid var(--color-outline)',
              }}
            >
              <AvatarRenderer config={userAvatarConfig} size={36} />
            </div>
          ) : (
            <Avatar size="sm" initials={userInitial} />
          )}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Chats</h2>
        </div>
        <Button
          variant="ghost"
          className="button-icon"
          style={{ borderRadius: '50%', padding: 8 }}
          onClick={() => setIsNewChatOpen(true)}
          title="Start a new chat"
          aria-label="Start a new chat"
        >
          <Edit size={20} />
        </Button>
      </div>

      {/* Stories */}
      <StoryRow />

      {/* Search */}
      <div className={styles['chat-search']}>
        <div style={{ position: 'relative' }}>
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, borderRadius: 20 }}
          />
          <Search
            size={18}
            color="var(--color-text-muted)"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className={styles['filters']}>
        {(['All', 'Unread', 'Friends', 'Groups'] as Filter[]).map((f) => (
          <button
            key={f}
            className={cn(styles['filter-chip'], filter === f && styles.active)}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filter === 'Groups' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '0 12px 10px',
            padding: '10px 14px',
            background:
              'linear-gradient(135deg, var(--color-brand-100, #ffedd5) 0%, #fed7aa 100%)',
            borderRadius: 14,
            border: '2px solid var(--color-outline, #1e293b)',
            boxShadow: 'var(--shadow-cartoon-sm, 2px 2px 0px #1e293b)',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-display, Fredoka, cursive)',
                color: '#1e293b',
              }}
            >
              Explore Cartoon Squads 🛹
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Discover public crews & meet friends
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/groups')}
            style={{ fontSize: '0.75rem', padding: '4px 10px', height: 28 }}
          >
            Browse
          </Button>
        </div>
      )}

      {/* List */}
      {renderContent()}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
};
