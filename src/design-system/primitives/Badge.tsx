import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './primitives.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'danger';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(styles.badge, className)}
        style={{
          backgroundColor: variant === 'danger' ? 'var(--color-danger)' : 'var(--color-brand-500)',
        }}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
