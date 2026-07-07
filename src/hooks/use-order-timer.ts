'use client';

import { useState, useEffect, useRef } from 'react';
import { elapsedSeconds, formatTimer } from '@/lib/utils';

export function useOrderTimer(createdAt: string) {
  const [seconds, setSeconds] = useState(elapsedSeconds(createdAt));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(elapsedSeconds(createdAt));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [createdAt]);

  const getColorClass = () => {
    if (seconds < 600) return 'text-green-400';
    if (seconds < 900) return 'text-yellow-400 animate-pulse';
    return 'text-red-400 animate-pulse';
  };

  return {
    seconds,
    formatted: formatTimer(seconds),
    colorClass: getColorClass(),
    isUrgent: seconds >= 900,
  };
}
