'use client';

import { useOrderTimer } from '@/hooks/use-order-timer';

interface Props {
  createdAt: string;
}

export default function OrderTimer({ createdAt }: Props) {
  const { formatted, colorClass, isUrgent } = useOrderTimer(createdAt);

  return (
    <span
      className={`font-mono text-sm font-bold transition-colors duration-700 ${colorClass} ${
        isUrgent ? 'animate-pulse' : ''
      }`}
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {formatted}
    </span>
  );
}
