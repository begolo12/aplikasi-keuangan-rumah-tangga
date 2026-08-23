import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-3xl bg-surface/50 my-4">
      {icon && <div className="mb-4 p-4 bg-surface-2 rounded-2xl text-text-muted">{icon}</div>}
      <h4 className="text-base font-bold text-text mb-1">{title}</h4>
      <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
