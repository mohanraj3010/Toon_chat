import { Character } from '@/assets/characters/Character';
import { ChatBubble } from '@/design-system/primitives';
import styles from './Chats.module.css';

interface Props {
  base: 1|2|3|4|5|6|7|8;
}

export const TypingIndicator = ({ base }: Props) => {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24, animation: 'popIn 0.3s ease-out forwards' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-brand-100)', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '2px solid var(--color-outline)' }}>
        <Character 
          base={base} 
          expression="surprised" 
          size={32} 
          style={{ transform: 'scale(1.2) translateY(4px)' }}
        />
      </div>
      <ChatBubble variant="received" showTail={true}>
        <div className={styles['typing-indicator']}>
          <div className={styles['typing-dot']} />
          <div className={styles['typing-dot']} />
          <div className={styles['typing-dot']} />
        </div>
      </ChatBubble>
    </div>
  );
};
