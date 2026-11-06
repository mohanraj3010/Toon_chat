import type { FC } from 'react';
import styles from './ReactionBar.module.css';
import {
  HeartReactionIcon,
  LaughReactionIcon,
  WowReactionIcon,
  CryReactionIcon,
  FireReactionIcon,
  PartyReactionIcon,
} from './reactionIcons';

export interface ReactionConfig {
  emoji: string;
  label: string;
  className: string;
  Icon: FC<{ size?: number }>;
}

export const CARTOON_REACTIONS: ReactionConfig[] = [
  {
    emoji: '❤️',
    label: 'Heart pop',
    className: styles['anim-heart'],
    Icon: HeartReactionIcon,
  },
  {
    emoji: '😂',
    label: 'Laugh bounce',
    className: styles['anim-laugh'],
    Icon: LaughReactionIcon,
  },
  {
    emoji: '😮',
    label: 'Wow burst',
    className: styles['anim-wow'],
    Icon: WowReactionIcon,
  },
  {
    emoji: '😢',
    label: 'Cry tear',
    className: styles['anim-cry'],
    Icon: CryReactionIcon,
  },
  {
    emoji: '🔥',
    label: 'Fire flame',
    className: styles['anim-fire'],
    Icon: FireReactionIcon,
  },
  {
    emoji: '🎉',
    label: 'Party confetti',
    className: styles['anim-party'],
    Icon: PartyReactionIcon,
  },
];

