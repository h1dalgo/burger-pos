'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { formatPrice } from '@/lib/utils';

/** Precio que "cuenta" hasta el nuevo valor cuando cambia (sin re-renders por cuadro). */
export function AnimatedPrice({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => formatPrice(v));

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] });
    return () => controls.stop();
  }, [value, reduced, mv]);

  return <motion.span className={`tabular-nums ${className ?? ''}`}>{text}</motion.span>;
}
