import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './primitives.module.css';

export interface ChatBubbleProps extends HTMLAttributes<HTMLDivElement> {
  variant: 'sent' | 'received';
  reaction?: ReactNode;
  showTail?: boolean;
}

const TailSent = () => (
  <svg className={cn(styles['chat-bubble-tail'], styles['chat-bubble-tail-sent'])} viewBox="0 0 20 20" fill="currentColor">
    <path d="M0,20 C10,20 18,12 20,0 C15,8 8,12 0,12 Z" />
  </svg>
);

const TailReceived = () => (
  <svg className={cn(styles['chat-bubble-tail'], styles['chat-bubble-tail-received'])} viewBox="0 0 20 20" fill="currentColor">
    <path d="M20,20 C10,20 2,12 0,0 C5,8 12,12 20,12 Z" />
  </svg>
);

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ className, variant, children, reaction, showTail = true, ...props }, ref) => {
    return (
      <div className={cn(styles['chat-bubble-container'], className)} style={{ alignSelf: variant === 'sent' ? 'flex-end' : 'flex-start' }}>
        <div
          ref={ref}
          className={cn(
            styles['chat-bubble'],
            styles[`chat-bubble-${variant}`]
          )}
          style={{ 
            borderBottomRightRadius: variant === 'sent' && showTail ? 4 : undefined,
            borderBottomLeftRadius: variant === 'received' && showTail ? 4 : undefined,
          }}
          {...props}
        >
          {children}
          {showTail && (variant === 'sent' ? <TailSent /> : <TailReceived />)}
        </div>
        {reaction && (
          <div style={{ 
            position: 'absolute', 
            bottom: -16, 
            [variant === 'sent' ? 'left' : 'right']: 12, 
            background: 'var(--color-bg-surface)', 
            borderRadius: 16, 
            padding: '4px 8px', 
            border: '2px solid var(--color-outline)', 
            fontSize: '14px',
            boxShadow: 'var(--shadow-sticker)',
            zIndex: 10,
            animation: 'popIn var(--motion-duration-fast) var(--motion-easing-bounce) forwards'
          }}>
            {reaction}
          </div>
        )}
      </div>
    );
  }
);
ChatBubble.displayName = 'ChatBubble';
