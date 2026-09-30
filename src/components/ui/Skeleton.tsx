import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

export function Skeleton({ count = 1, className, ...props }: SkeletonProps) {
  if (count > 1) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn('skeleton', className)} {...props} />
        ))}
      </div>
    );
  }

  return <div aria-hidden="true" className={cn('skeleton', className)} {...props} />;
}
