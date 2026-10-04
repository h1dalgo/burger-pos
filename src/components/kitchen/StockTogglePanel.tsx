'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Category } from '@/types';
import { useStockStore } from '@/store/stock-store';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  onClose: () => void;
}

export default function StockTogglePanel({ onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const applyStockUpdate = useStockStore((s) => s.applyStockUpdate);

  const load = useCallback(() => {
    fetch('/api/products', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Category[]) => {
        setCategories(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAvailability = async (type: 'product' | 'variation', id: string, current: boolean) => {
    if (saving) return;
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

    applyStockUpdate({ type, id, isAvailable: newAvailable });
    try {
      const res = await fetch('/api/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, isAvailable: newAvailable }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('No se pudo actualizar el stock');
      setStatus('loading');
      load();
    } finally {
      setSaving(null);
    }
  };

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l-2 border-carbon z-40 overflow-y-auto shadow-pop"
      role="dialog"
      aria-label="Control de stock"
    >
      <div className="sticky top-0 bg-card px-5 py-4 border-b-2 border-carbon flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-mustard border-2 border-carbon flex items-center justify-center">
            <Package className="w-4 h-4 text-carbon" />
          </div>
          <div>
            <h2 className="font-bold text-carbon text-sm">Control de Stock</h2>
            <p className="text-[10px] text-carbon/60 uppercase tracking-wider">Activar / Desactivar</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel de stock"
          className="text-carbon/60 hover:text-carbon hover:bg-carbon/10 p-1.5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-1">
        {status === 'loading' && (
          <div className="space-y-3 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-10 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose" />
            <p className="text-sm text-carbon/70">No pudimos cargar los productos</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatus('loading');
                load();
              }}
            >
              Reintentar
            </Button>
          </div>
        )}

        {status === 'ready' && categories.length === 0 && (
          <div className="text-center text-carbon/45 py-12">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin productos</p>
          </div>
        )}

        {status === 'ready' &&
          categories.map((cat) => (
            <div key={cat.id} className="rounded-xl overflow-hidden">
              <button
                onClick={() => {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  });
                }}
                aria-expanded={expanded.has(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-carbon/[0.05] transition-colors text-left"
              >
                {expanded.has(cat.id) ? (
                  <ChevronDown className="w-4 h-4 text-burger shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-carbon/50 shrink-0" />
                )}
                <span className="text-sm font-semibold text-carbon">{cat.name}</span>
                <span className="ml-auto text-[10px] font-mono">
                  {cat.products.filter((p) => !p.isAvailable).length > 0 && (
                    <span className="text-rose">
                      {cat.products.filter((p) => !p.isAvailable).length} ocultos
                    </span>
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
                    <div className="ml-4 mr-1 space-y-0.5 pb-2 border-l-2 border-carbon/15 pl-3">
                      {cat.products.map((product) => (
                        <div key={product.id}>
                          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-carbon/[0.05] transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              {!product.isAvailable && (
                                <AlertTriangle className="w-3 h-3 text-rose shrink-0" />
                              )}
                              <span
                                className={`text-sm truncate ${
                                  product.isAvailable ? 'text-carbon' : 'text-carbon/50 line-through'
                                }`}
                              >
                                {product.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={product.isAvailable}
                              aria-label={`Disponibilidad de ${product.name}`}
                              onClick={() => toggleAvailability('product', product.id, product.isAvailable)}
                              disabled={saving === product.id}
                              className={`relative w-10 h-5 rounded-full transition-[background-color,opacity] shrink-0 disabled:opacity-50 ${
                                product.isAvailable ? 'bg-mint' : 'bg-carbon/25'
                              }`}
                            >
                              <motion.div
                                animate={{ x: product.isAvailable ? 20 : 2 }}
                                className="absolute top-0.5 w-4 h-4 rounded-full shadow-md bg-white"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>

                          {product.variations?.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between py-1 px-2 ml-3 rounded-lg hover:bg-carbon/[0.05] transition-colors"
                            >
                              <span
                                className={`text-xs truncate ${
                                  v.isAvailable ? 'text-carbon/70' : 'text-carbon/45 line-through'
                                }`}
                              >
                                {v.name}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={v.isAvailable}
                                aria-label={`Disponibilidad de ${v.name}`}
                                onClick={() => toggleAvailability('variation', v.id, v.isAvailable)}
                                disabled={saving === v.id}
                                className={`relative w-8 h-4 rounded-full transition-[background-color,opacity] shrink-0 disabled:opacity-50 ${
                                  v.isAvailable ? 'bg-mint' : 'bg-carbon/25'
                                }`}
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
          ))}
      </div>
    </motion.div>
  );
}
