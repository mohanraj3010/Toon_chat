import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../api/useChat';
import { useConversations } from '../api/useChats';
import { Button, EmptyState } from '@/design-system/primitives';
import { ArrowLeft, Phone, Video, Info, WifiOff } from 'lucide-react';
import { Character } from '@/assets/characters/Character';
import { useAvatarConfig } from '@/features/avatar/api/avatarService';
import { AvatarRenderer } from '@/features/avatar/components/AvatarRenderer';
import { IllustrationError } from '@/assets/illustrations/EmptyStates';
import styles from '../components/Chats.module.css';
import { MessageList } from '../components/MessageList';
import { Composer } from '../components/Composer';
import {
  useGroupByConversationId,
  usePinMessage,
  CURRENT_USER_ID,
} from '@/features/groups/api/groupsService';
import { getGroupPermissions } from '@/features/groups/types';
import { GroupAvatarView } from '@/features/groups/components/GroupAvatarView';
import { PinnedMessageBanner } from '@/features/groups/components/PinnedMessageBanner';
import { GroupDetailsDrawer } from '@/features/groups/components/GroupDetailsDrawer';
import { useAuth } from '@/features/auth/context/useAuth';
import { AudioPlaybackProvider } from '../context/AudioPlaybackContext';

export default function ChatConversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const { user } = useAuth();
  const currentUserId = user?.id || CURRENT_USER_ID;

  // We need the chat details for header
  const { data: chatList } = useConversations();
  const chat = chatList?.find((c) => c.id === id);

  // Group metadata if this is a group chat
  const { data: group } = useGroupByConversationId(id);
  const pinMutation = usePinMessage();

  // Interaction layer with realtime WebSocket & persistent history
  const {
    messages,
    isLoading,
    isTyping,
    typingUser,
    connectionStatus,
    sendMessage,
    sendVoiceMessage,
    retryMessage,
    react,
    sendTyping,
    loadOlderMessages,
    hasMoreOlder,
    isLoadingOlder,
  } = useChat(id);

  const isGroup = chat?.type === 'group' || Boolean(group);
  const currentMember = group?.members.find((m) => m.id === currentUserId);
  const permissions = getGroupPermissions(currentMember?.role || 'member');

  const otherParticipant =
    chat?.participants?.find((p) => p.id !== currentUserId) || chat?.participants?.[0];
  const { data: otherAvatarConfig } = useAvatarConfig(!isGroup ? otherParticipant?.id : undefined);

  const participantsMap = useMemo(() => {
    const map: Record<string, { displayName: string; themeBase?: number; avatarConfig?: any }> = {};
    if (chat?.participants) {
      chat.participants.forEach((p) => {
        map[p.id] = {
          displayName: p.displayName,
          themeBase: (p as any).themeBase,
          avatarConfig: (p as any).avatarConfig,
        };
      });
    }
    if (group?.members) {
      group.members.forEach((m) => {
        map[m.id] = {
          displayName: m.displayName,
          themeBase: m.themeBase,
          avatarConfig: m.avatarConfig,
        };
      });
    }
    return map;
  }, [chat, group]);

  if (isLoading && !chat) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!chat) {
    return (
      <EmptyState
        illustration={<IllustrationError style={{ transform: 'scale(0.8)' }} />}
        title="Chat not found"
        description="This conversation might have been deleted."
        action={<Button onClick={() => navigate('/')}>Go Back</Button>}
      />
    );
  }

  const name =
    group?.name || chat?.name || otherParticipant?.displayName || 'Squad Chat';
  const participantBase =
    chat?.themeBase || otherParticipant?.themeBase || (isGroup ? 7 : 1);

  return (
    <AudioPlaybackProvider conversationId={id}>
      <div
        style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--color-bg-base)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-neutral-200)',
          zIndex: 10,
        }}
      >
        <Button
          variant="ghost"
          className={styles['desktop-hidden']}
          onClick={() => navigate('/')}
          style={{ padding: 8, marginLeft: -8, marginRight: -4 }}
        >
          <ArrowLeft size={24} color="var(--color-text)" />
        </Button>

        {isGroup && group ? (
          <div
            onClick={() => setShowGroupDetails(true)}
            style={{ cursor: 'pointer', flexShrink: 0 }}
            title="View squad details"
          >
            <GroupAvatarView avatar={group.avatar} size={44} />
          </div>
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'var(--color-brand-100)',
              border: '2px solid var(--color-outline)',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {otherAvatarConfig ? (
              <AvatarRenderer
                config={otherAvatarConfig}
                size={44}
                expression={isTyping ? 'surprised' : 'happy'}
              />
            ) : (
              <Character
                base={participantBase}
                expression={isTyping ? 'surprised' : 'happy'}
                size={44}
                style={{ transform: 'scale(1.2) translateY(5px)' }}
              />
            )}
          </div>
        )}

        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', cursor: isGroup ? 'pointer' : 'default' }}
          onClick={() => {
            if (isGroup && group) setShowGroupDetails(true);
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{name}</h3>
          <span
            style={{
              fontSize: '0.8rem',
              color: isTyping ? 'var(--color-brand-500)' : 'var(--color-text-muted)',
            }}
          >
            {isTyping
              ? typingUser
                ? `${typingUser} is typing...`
                : 'typing...'
              : isGroup && group
              ? `${group.members.length} members`
              : 'Active now'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant="ghost" style={{ padding: 8, opacity: 0.5 }} title="Coming soon">
            <Phone size={20} color="var(--color-text)" />
          </Button>
          <Button variant="ghost" style={{ padding: 8, opacity: 0.5 }} title="Coming soon">
            <Video size={20} color="var(--color-text)" />
          </Button>
          <Button
            variant="ghost"
            style={{ padding: 8 }}
            onClick={() => {
              if (isGroup && group) {
                setShowGroupDetails(true);
              }
            }}
            title={isGroup ? 'Squad Info' : 'Chat Info'}
            aria-label={isGroup ? 'Squad Info' : 'Chat Info'}
          >
            <Info size={20} color="var(--color-text)" />
          </Button>
        </div>
      </div>

      {/* Realtime Connection Status Pill (Minimal Cartoon Indicator) */}
      {connectionStatus !== 'connected' && (
        <div
          style={{
            backgroundColor:
              connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                ? 'var(--color-brand-100, #ffedd5)'
                : 'var(--color-neutral-100, #f1f5f9)',
            color:
              connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                ? 'var(--color-brand-600, #ea580c)'
                : 'var(--color-text-muted, #64748b)',
            padding: '4px 12px',
            fontSize: '0.76rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display, Fredoka, cursive)',
            textAlign: 'center',
            borderBottom: '1px solid var(--color-neutral-200, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            zIndex: 9,
          }}
        >
          {connectionStatus === 'offline' && <WifiOff size={14} />}
          <span>
            {connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
              ? 'Connecting to Maple Park... 🎈'
              : 'Offline. Reconnecting when connection returns 💤'}
          </span>
        </div>
      )}

      {/* Pinned Message Banner */}
      {isGroup && group?.pinnedMessage && (
        <PinnedMessageBanner
          pinnedMessage={group.pinnedMessage}
          canUnpin={permissions.canPin}
          onUnpin={() => pinMutation.mutate({ groupId: group.id })}
          onClick={() => setShowGroupDetails(true)}
        />
      )}

      {/* Body */}
      <MessageList
        messages={messages}
        isTyping={isTyping}
        participantBase={participantBase}
        onSendAction={(text, type) => sendMessage(text, type)}
        onRetry={retryMessage}
        onReact={react}
        onLoadOlder={loadOlderMessages}
        hasMoreOlder={hasMoreOlder}
        isLoadingOlder={isLoadingOlder}
        isGroup={isGroup}
        participantsMap={participantsMap}
      />

      {/* Composer */}
      <Composer
        conversationId={id}
        onSend={(content, type, mediaInfo) =>
          sendMessage(content, type || 'text', undefined, mediaInfo)
        }
        onSendVoice={sendVoiceMessage}
        onTyping={sendTyping}
      />

      {/* Group Details Drawer */}
      {isGroup && group && (
        <GroupDetailsDrawer
          group={group}
          isOpen={showGroupDetails}
          onClose={() => setShowGroupDetails(false)}
        />
      )}
    </div>
  </AudioPlaybackProvider>
);
}
