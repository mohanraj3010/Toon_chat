import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import styles from './primitives.module.css';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  illustration: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, illustration, title, description, action, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(styles['empty-state'], className)} {...props}>
        <div style={{ marginBottom: 16 }}>{illustration}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';
