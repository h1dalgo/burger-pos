'use client';

import { useEffect } from 'react';
import { useBusinessStore, useRate } from '@/store/business-store';
import { formatBs } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Equivalente en bolívares de un precio en dólares (no muestra nada si no hay tasa). */
export function PriceBs({ usd, className, rate: fixedRate }: { usd: number; className?: string; rate?: number | null }) {
  const load = useBusinessStore((s) => s.load);
  const liveRate = useRate();
  useEffect(() => {
    void load();
  }, [load]);
  const rate = fixedRate ?? liveRate;
  if (!rate || !Number.isFinite(usd)) return null;
  return <span className={cn('tabular-nums', className)}>{formatBs(usd * rate)}</span>;
}
