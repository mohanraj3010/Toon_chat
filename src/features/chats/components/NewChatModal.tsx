import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, MessageSquarePlus, Loader2 } from 'lucide-react';
import { Button, Input } from '@/design-system/primitives';
import { Character } from '@/assets/characters/Character';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useModalA11y } from '@/shared/hooks/useModalA11y';
import { showToast } from '@/shared/ui/Toast';
import { useCreateConversation, useSearchUsers, type UserSearchItem } from '../api/useChats';
import styles from './Chats.module.css';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    isOpen,
    onClose,
    containerRef,
  });

  const { data: users, isLoading, isError, error } = useSearchUsers(debouncedSearch, isOpen);
  const createConversation = useCreateConversation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectUser = async (targetUser: UserSearchItem) => {
    try {
      setSelectedUserId(targetUser.id);
      const conversation = await createConversation.mutateAsync(targetUser.id);
      showToast(`Started conversation with ${targetUser.displayName}! 💬✨`, 'success');
      onClose();
      setSearch('');
      navigate(`/chat/${conversation.id}`);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Could not start chat. Please try again.';
      showToast(msg, 'error');
    } finally {
      setSelectedUserId(null);
    }
  };

  return (
    <div
      className={styles['modal-overlay']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chat-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !createConversation.isPending) {
          onClose();
        }
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={styles['modal-sheet']}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={createConversation.isPending}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted, #64748b)',
            cursor: createConversation.isPending ? 'not-allowed' : 'pointer',
            padding: 6,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close new chat dialog"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'var(--color-brand-100, #ffedd5)',
              border: '2px solid var(--color-outline, #1e293b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-brand-600, #ea580c)',
            }}
          >
            <MessageSquarePlus size={22} />
          </div>
          <div>
            <h2
              id="new-chat-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display, Fredoka, cursive)',
                margin: 0,
                color: 'var(--color-text-base, #1e293b)',
              }}
            >
              Start a New Chat
            </h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)' }}>
              Pick a cartoon friend from Maple Park to start chatting!
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Input
            placeholder="Search by username or display name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={createConversation.isPending}
            style={{
              paddingLeft: 38,
              borderRadius: 20,
              border: '2px solid var(--color-outline, #1e293b)',
            }}
            autoFocus
          />
          <Search
            size={18}
            color="var(--color-text-muted, #64748b)"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        {/* Users List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingRight: 4,
          }}
          role="list"
        >
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    borderRadius: 14,
                    border: '1.5px dashed var(--color-outline-dim, #cbd5e1)',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-bg-muted, #e2e8f0)',
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        width: '45%',
                        height: 14,
                        backgroundColor: 'var(--color-bg-muted, #e2e8f0)',
                        borderRadius: 4,
                      }}
                    />
                    <div
                      style={{
                        width: '60%',
                        height: 12,
                        backgroundColor: 'var(--color-bg-muted, #e2e8f0)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.88rem',
              }}
            >
              {error?.message || 'Could not load cartoon friends. Check database connection.'}
            </div>
          )}

          {!isLoading && !isError && (!users || users.length === 0) && (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: '2rem' }}>🔍🎈</div>
              <div
                style={{
                  fontWeight: 700,
                  fontFamily: 'var(--font-display, Fredoka, cursive)',
                  color: 'var(--color-text-base, #1e293b)',
                }}
              >
                {debouncedSearch ? 'No citizens matched your search' : 'No other citizens yet!'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)', maxWidth: 280 }}>
                {debouncedSearch
                  ? 'Try searching with another username or display name.'
                  : 'Register a friend account to start your first 1-on-1 direct chat!'}
              </div>
            </div>
          )}

          {!isLoading &&
            !isError &&
            users &&
            users.map((targetUser) => {
              const isSelected = selectedUserId === targetUser.id;
              const isPending = createConversation.isPending && isSelected;

              return (
                <button
                  key={targetUser.id}
                  onClick={() => handleSelectUser(targetUser)}
                  disabled={createConversation.isPending}
                  role="listitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 16,
                    border: '2px solid var(--color-outline, #1e293b)',
                    backgroundColor: isSelected
                      ? 'var(--color-brand-100, #ffedd5)'
                      : 'var(--color-bg-surface, #ffffff)',
                    boxShadow: 'var(--shadow-cartoon-sm, 2px 2px 0px #1e293b)',
                    cursor: createConversation.isPending ? 'not-allowed' : 'pointer',
                    transition: 'transform 100ms ease, box-shadow 100ms ease',
                    textAlign: 'left',
                    opacity: createConversation.isPending && !isSelected ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!createConversation.isPending) {
                      e.currentTarget.style.transform = 'translate(-1px, -1px)';
                      e.currentTarget.style.boxShadow = '3px 3px 0px #1e293b';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-cartoon-sm, 2px 2px 0px #1e293b)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '1.5px solid var(--color-outline, #1e293b)',
                        backgroundColor: 'var(--color-bg-muted, #f8fafc)',
                        flexShrink: 0,
                      }}
                    >
                      <Character
                        base={targetUser.themeBase || 1}
                        expression="happy"
                        size={46}
                        style={{ transform: 'scale(1.2) translateY(6px)' }}
                      />
                      {targetUser.status === 'online' && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-success, #22c55e)',
                            border: '1.5px solid white',
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          fontFamily: 'var(--font-display, Fredoka, cursive)',
                          color: 'var(--color-text-base, #1e293b)',
                        }}
                      >
                        {targetUser.displayName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)' }}>
                        @{targetUser.username}
                        {targetUser.vibeText ? ` • "${targetUser.vibeText}"` : ''}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isSelected ? 'primary' : 'secondary'}
                    disabled={createConversation.isPending}
                    style={{ fontSize: '0.78rem', height: 32, padding: '0 12px' }}
                  >
                    {isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Chat'
                    )}
                  </Button>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

