import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ChatList } from '../components/ChatList';
import { NewChatModal } from '../components/NewChatModal';
import { EmptyState, Button } from '@/design-system/primitives';
import { IllustrationEmptyInbox } from '@/assets/illustrations/EmptyStates';
import styles from '../components/Chats.module.css';
import { cn } from '@/shared/lib/utils';

export default function HomePage() {
  const { id } = useParams();
  const isChatSelected = !!id;
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  return (
    <div className={cn(styles['home-layout'], isChatSelected && styles['chat-selected'])}>
      <div className={styles['home-sidebar']}>
        <ChatList />
      </div>
      <div className={styles['home-main']}>
        {isChatSelected ? (
          <Outlet />
        ) : (
          <EmptyState
            illustration={<IllustrationEmptyInbox style={{ transform: 'scale(0.8)' }} />}
            title="ToonChat for Web"
            description="Send and receive messages with your cartoon friends in real time."
            action={
              <Button
                variant="primary"
                style={{ marginTop: 16 }}
                onClick={() => setIsNewChatOpen(true)}
              >
                Start a new chat
              </Button>
            }
          />
        )}
      </div>
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
}
