'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';

interface Props {
  onClick: () => void;
}

export default function CartFloatingButton({ onClick }: Props) {
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const getTotalAmount = useCartStore((s) => s.getTotalAmount);
  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();

  return (
    <motion.button
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={`Ver pedido: ${totalItems} productos, ${formatPrice(totalAmount)}`}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gradient-to-r from-burger to-mustard text-white pl-5 pr-6 py-3.5 rounded-full shadow-pop font-semibold"
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        <AnimatePresence mode="wait">
          <motion.span
            key={totalItems}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute -top-2 -right-3 min-w-5 h-5 px-1 bg-carbon text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {totalItems}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="hidden sm:inline">Ver Pedido</span>
      <span className="font-bold tabular-nums">{formatPrice(totalAmount)}</span>
    </motion.button>
  );
}
