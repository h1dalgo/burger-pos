'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight, Package, AlertTriangle } from 'lucide-react';
import type { Category } from '@/types';
import { useStockStore } from '@/store/stock-store';

interface Props {
  onClose: () => void;
}

export default function StockTogglePanel({ onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const applyStockUpdate = useStockStore((s) => s.applyStockUpdate);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const toggleAvailability = async (type: string, id: string, current: boolean) => {
    const newAvailable = !current;
    setSaving(id);

    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        products: cat.products.map((p) => {
          if (type === 'product' && p.id === id) {
            return { ...p, isAvailable: newAvailable };
          }
          return {
            ...p,
            variations: p.variations?.map((v) =>
              type === 'variation' && v.id === id ? { ...v, isAvailable: newAvailable } : v
            ),
          };
        }),
      }))
    );

    applyStockUpdate({ type, id, isAvailable: newAvailable } as any);
    await fetch('/api/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, isAvailable: newAvailable }),
    });
    setSaving(null);
  };

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-[#1a1a2e]/95 backdrop-blur-xl border-l border-gray-700/50 z-40 overflow-y-auto shadow-2xl"
    >
      <div className="sticky top-0 bg-[#1a1a2e]/95 backdrop-blur-xl px-5 py-4 border-b border-gray-700/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E85D04] to-[#FFB703] flex items-center justify-center shadow-md">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Control de Stock</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Activar / Desactivar</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white hover:bg-gray-800 p-1.5 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-1">
        {categories.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Cargando productos...</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="rounded-xl overflow-hidden">
              <button
                onClick={() => {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                    return next;
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-800/50 transition-colors text-left"
              >
                {expanded.has(cat.id) ? <ChevronDown className="w-4 h-4 text-[#FFB703] shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
                <span className="text-sm font-semibold text-white">{cat.name}</span>
                <span className="ml-auto text-[10px] text-gray-500 font-mono">
                  {cat.products.filter((p) => !p.isAvailable).length > 0 && (
                    <span className="text-red-400">{cat.products.filter((p) => !p.isAvailable).length} ocultos</span>
                  )}
                </span>
              </button>

              <AnimatePresence>
                {expanded.has(cat.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 mr-1 space-y-0.5 pb-2 border-l-2 border-gray-800/50 pl-3">
                      {cat.products.map((product) => (
                        <div key={product.id}>
                          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-800/30 transition-colors group">
                            <div className="flex items-center gap-2 min-w-0">
                              {!product.isAvailable && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                              <span className={`text-sm truncate ${product.isAvailable ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                                {product.name}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleAvailability('product', product.id, product.isAvailable)}
                              disabled={saving === product.id}
                              className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${
                                product.isAvailable ? 'bg-gradient-to-r from-[#06D6A0] to-emerald-500 shadow-emerald-500/20' : 'bg-gray-700'
                              } ${saving === product.id ? 'opacity-50' : ''}`}
                            >
                              <motion.div
                                animate={{ x: product.isAvailable ? 20 : 2 }}
                                className={`absolute top-0.5 w-4 h-4 rounded-full shadow-md ${
                                  product.isAvailable ? 'bg-white' : 'bg-gray-400'
                                }`}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>

                          {product.variations?.map((v) => (
                            <div key={v.id} className="flex items-center justify-between py-1 px-2 ml-3 rounded-lg hover:bg-gray-800/20 transition-colors group">
                              <span className={`text-xs ${v.isAvailable ? 'text-gray-400' : 'text-gray-600 line-through'}`}>
                                {v.name}
                              </span>
                              <button
                                onClick={() => toggleAvailability('variation', v.id, v.isAvailable)}
                                disabled={saving === v.id}
                                className={`relative w-8 h-4 rounded-full transition-all shrink-0 ${
                                  v.isAvailable ? 'bg-[#06D6A0]' : 'bg-gray-700'
                                } ${saving === v.id ? 'opacity-50' : ''}`}
                              >
                                <motion.div
                                  animate={{ x: v.isAvailable ? 15 : 1.5 }}
                                  className="absolute top-0.5 w-3 h-3 rounded-full shadow-sm bg-white"
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
