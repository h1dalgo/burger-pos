'use client';

import { useOrderTimer } from '@/hooks/use-order-timer';

interface Props {
  createdAt: string;
}

export default function OrderTimer({ createdAt }: Props) {
  const { formatted, colorClass, isUrgent } = useOrderTimer(createdAt);

  return (
    <span
      className={`font-mono text-base font-bold tabular-nums transition-colors duration-700 ${colorClass} ${
        isUrgent ? 'animate-pulse' : ''
      }`}
      aria-label={`Tiempo transcurrido: ${formatted}`}
    >
      {formatted}
    </span>
  );
}
