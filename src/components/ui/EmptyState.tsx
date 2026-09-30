import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  dark?: boolean;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  dark = false,
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
            'flex items-center justify-center rounded-2xl',
            compact ? 'h-10 w-10' : 'h-14 w-14',
            dark ? 'bg-white/5 text-white/30' : 'bg-carbon/5 text-carbon/30'
          )}
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          'font-semibold',
          compact ? 'text-sm' : 'text-base',
          dark ? 'text-white/70' : 'text-carbon/80'
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'max-w-xs text-sm',
            dark ? 'text-white/40' : 'text-carbon/50'
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
