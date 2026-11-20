'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { CART_BUMP_EVENT } from '@/lib/fly-to-cart';

interface Props {
  onClick: () => void;
}

export default function CartFloatingButton({ onClick }: Props) {
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const getTotalAmount = useCartStore((s) => s.getTotalAmount);
  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();
  const bump = useAnimationControls();
  const reduced = useReducedMotion();

  // Rebote al recibir un producto (ver lib/fly-to-cart)
  useEffect(() => {
    const onBump = () => {
      void bump.start(
        reduced
          ? { scale: [1, 1.04, 1], transition: { duration: 0.2 } }
          : { scale: [1, 1.16, 0.95, 1.03, 1], transition: { duration: 0.5, ease: 'easeOut' } }
      );
      if (!reduced && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12);
    };
    window.addEventListener(CART_BUMP_EVENT, onBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump);
  }, [bump, reduced]);

  return (
    <motion.button
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      data-cart-target
      aria-label={`Ver pedido: ${totalItems} productos, ${formatPrice(totalAmount)}`}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full py-3.5 pl-5 pr-6 font-semibold text-[#17110a] [background:var(--gold-grad)] shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_22px_44px_-18px_rgb(216_173_102/0.6),0_10px_30px_-10px_rgb(0_0_0/0.8)]"
    >
      <motion.span animate={bump} className="flex items-center gap-3">
        <span className="relative">
          <ShoppingBag className="w-5 h-5" />
          <AnimatePresence mode="wait">
            <motion.span
              key={totalItems}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute -top-2 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#17110a] px-1 text-[11px] font-bold text-[#f0d29c] tabular-nums"
            >
              {totalItems}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="hidden sm:inline">Ver Pedido</span>
        <span className="h-4 w-px bg-[#17110a]/25" aria-hidden="true" />
        <span className="font-bold tabular-nums">{formatPrice(totalAmount)}</span>
      </motion.span>
    </motion.button>
  );
}
