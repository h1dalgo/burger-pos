'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import type { Category } from '@/types';
import { useStockStore } from '@/store/stock-store';

interface Props {
  onClose: () => void;
}

export default function StockTogglePanel({ onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const applyStockUpdate = useStockStore((s) => s.applyStockUpdate);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const toggleAvailability = async (type: string, id: string, current: boolean) => {
    const newAvailable = !current;
    applyStockUpdate({ type, id, isAvailable: newAvailable } as any);

    await fetch('/api/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, isAvailable: newAvailable }),
    });
  };

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      exit={{ x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-[#1a1a2e] border-l border-gray-700 z-40 overflow-y-auto"
    >
      <div className="sticky top-0 bg-[#1a1a2e] px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="font-bold text-white">Gestión de Stock</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => {
                setExpanded((prev) => {
                  const next = new Set(prev);
                  next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                  return next;
                });
              }}
              className="flex items-center gap-2 text-[#FFB703] font-semibold text-sm w-full text-left"
            >
              {expanded.has(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {cat.name}
            </button>

            <AnimatePresence>
              {expanded.has(cat.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 mt-2 space-y-2 overflow-hidden"
                >
                  {cat.products.map((product) => (
                    <div key={product.id}>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-300 text-sm">{product.name}</span>
                        <button
                          onClick={() => toggleAvailability('product', product.id, product.isAvailable)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            product.isAvailable ? 'bg-[#06D6A0]' : 'bg-gray-600'
                          }`}
                        >
                          <motion.div
                            animate={{ x: product.isAvailable ? 20 : 2 }}
                            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      {product.variations?.map((v) => (
                        <div key={v.id} className="flex items-center justify-between py-1 ml-4">
                          <span className="text-gray-400 text-xs">{v.name}</span>
                          <button
                            onClick={() => toggleAvailability('variation', v.id, v.isAvailable)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              v.isAvailable ? 'bg-[#06D6A0]' : 'bg-gray-600'
                            }`}
                          >
                            <motion.div
                              animate={{ x: v.isAvailable ? 20 : 2 }}
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
