'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  product: Product;
  isAvailable: boolean;
  onSelect: (product: Product) => void;
  index: number;
}

export default function ProductCard({ product, isAvailable, onSelect, index }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => isAvailable && onSelect(product)}
      disabled={!isAvailable}
      className={`relative w-full text-left rounded-2xl p-4 border-2 transition-all ${
        isAvailable
          ? 'bg-white border-gray-100 hover:border-[#E85D04] hover:shadow-lg active:scale-[0.98]'
          : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
      }`}
    >
      {!isAvailable && (
        <div className="absolute top-3 right-3 bg-[#EF476F] text-white text-xs font-bold px-2 py-1 rounded-full">
          Agotado
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#2B2D42] text-base truncate">
            {product.name}
          </h3>
          <p className="text-sm text-[#2B2D42]/60 mt-1 line-clamp-2">
            {product.description}
          </p>
          <p className="font-bold text-[#E85D04] text-lg mt-2">
            {formatPrice(Number(product.basePrice))}
          </p>
        </div>

        {isAvailable && (
          <div className="w-10 h-10 rounded-full bg-[#FFB703] flex items-center justify-center flex-shrink-0 shadow-md">
            <Plus className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {product.hasVariation && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {product.variations.map((v) => (
            <span
              key={v.id}
              className="text-xs bg-[#FFF8F0] text-[#2B2D42]/70 px-2 py-0.5 rounded-full"
            >
              {v.name}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
