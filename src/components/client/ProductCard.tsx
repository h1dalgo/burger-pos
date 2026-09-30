'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ImageIcon } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface Props {
  product: Product;
  isAvailable: boolean;
  onSelect: (product: Product) => void;
  index: number;
}

export default function ProductCard({ product, isAvailable, onSelect, index }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = product.imageUrl ?? '';
  const hasImage = imageUrl !== '' && !imageFailed;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      onClick={() => isAvailable && onSelect(product)}
      disabled={!isAvailable}
      aria-label={`${product.name}, ${formatPrice(Number(product.basePrice))}${isAvailable ? '' : ', agotado'}`}
      className={`group relative text-left rounded-2xl p-4 transition-all ${
        isAvailable
          ? 'card hover:border-burger/40 hover:shadow-pop active:scale-[0.98]'
          : 'bg-carbon/4 border border-carbon/8 opacity-60 cursor-not-allowed'
      }`}
    >
      {!isAvailable && (
        <div className="absolute top-3 right-3 z-10">
          <Badge tone="danger">Agotado</Badge>
        </div>
      )}

      <div className="flex items-start gap-3.5">
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-carbon/5 flex items-center justify-center">
          {hasImage ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageFailed(true)}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-carbon/25" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-carbon text-base leading-snug">{product.name}</h3>
          <p className="text-sm text-carbon/55 mt-0.5 line-clamp-2">{product.description}</p>
          <p className="font-bold text-burger text-lg mt-2 tabular-nums">
            {formatPrice(Number(product.basePrice))}
          </p>
        </div>

        {isAvailable && (
          <div
            aria-hidden="true"
            className="w-11 h-11 rounded-full bg-gradient-to-br from-burger to-mustard flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-105"
          >
            <Plus className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {product.hasVariation && product.variations.length > 0 && (
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {product.variations.map((v) => (
            <span key={v.id} className="badge badge-neutral">
              {v.name}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
