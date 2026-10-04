import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1.5 px-4 py-6' : 'gap-2.5 px-6 py-12',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-xl border-2 bg-mustard/25 border-carbon/20 text-carbon/60',
            compact ? 'h-10 w-10' : 'h-14 w-14'
          )}
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          'font-bold text-carbon',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-xs text-sm text-carbon/65">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
