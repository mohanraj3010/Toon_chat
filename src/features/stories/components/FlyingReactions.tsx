import { memo } from 'react';
import styles from './FlyingReactions.module.css';

export interface ReactionParticle {
  id: string;
  emoji: string;
  x: number; // percentage
  rotation: number;
}

interface FlyingReactionsProps {
  particles: ReactionParticle[];
}

export const FlyingReactions = memo(function FlyingReactions({ particles }: FlyingReactionsProps) {
  if (!particles.length) return null;

  return (
    <div className={styles.flyingContainer} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={styles.flyingEmoji}
          style={{
            left: `${p.x}%`,
            fontSize: '36px',
            ['--rot' as string]: `${p.rotation}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
});
