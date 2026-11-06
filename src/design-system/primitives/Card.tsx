import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './primitives.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, raised, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.card, raised && styles['card-raised'], className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
