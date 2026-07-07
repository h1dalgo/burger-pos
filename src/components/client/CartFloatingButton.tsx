'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';

interface Props {
  onClick: () => void;
}

export default function CartFloatingButton({ onClick }: Props) {
  const items = useCartStore((s) => s.items);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const getTotalAmount = useCartStore((s) => s.getTotalAmount);
  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();

  if (items.length === 0) return null;

  return (
    <motion.button
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#E85D04] text-white px-6 py-3 rounded-full shadow-2xl"
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        <AnimatePresence mode="wait">
          <motion.span
            key={totalItems}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute -top-2 -right-3 w-5 h-5 bg-[#EF476F] text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {totalItems}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="font-semibold">Ver Pedido</span>
      <span className="font-bold">{formatPrice(totalAmount)}</span>
    </motion.button>
  );
}
