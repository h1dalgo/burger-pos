'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Plus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Product, ProductVariation, ExtraIngredient } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useStockStore } from '@/store/stock-store';
import { Button } from '@/components/ui/Button';
import BurgerBuilder from './BurgerBuilder';

interface Props {
  product: Product;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const getItemPrice = useCartStore((s) => s.getItemPrice);
  const isVariationAvailable = useStockStore((s) => s.isVariationAvailable);
  const isOptionAvailable = useStockStore((s) => s.isOptionAvailable);
  const isExtraAvailable = useStockStore((s) => s.isExtraAvailable);

  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<ExtraIngredient[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleSelectionToggle = (selectionId: string, optionName: string, max: number) => {
    setSelections((prev) => {
      const current = prev[selectionId] || [];
      if (current.includes(optionName)) {
        return { ...prev, [selectionId]: current.filter((o) => o !== optionName) };
      }
      if (current.length >= max) return prev;
      return { ...prev, [selectionId]: [...current, optionName] };
    });
  };

  const handleAddToCart = useCallback(() => {
    if (product.hasVariation && !selectedVariation) {
      setError('Selecciona una opción obligatoria');
      return;
    }
    for (const rs of product.requiredSelections) {
      const selected = selections[rs.id] || [];
      if (selected.length < 1) {
        setError(`Selecciona: ${rs.label}`);
        return;
      }
    }
    setError('');

    addItem({
      product,
      variation: selectedVariation,
      quantity,
      removedIngredients,
      addedExtras,
      selections,
    });

    toast.success(`${product.name} agregado al pedido`);
    onClose();
  }, [product, selectedVariation, quantity, removedIngredients, addedExtras, selections, addItem, onClose]);

  const previewItem = {
    id: 'preview',
    product,
    variation: selectedVariation,
    quantity: 1,
    removedIngredients,
    addedExtras,
    selections,
  };
  const previewPrice = getItemPrice(previewItem);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[90vh] bg-cream rounded-t-3xl sm:rounded-3xl overflow-y-auto overscroll-contain"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 pt-5 pb-3 bg-cream rounded-t-3xl">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-carbon leading-tight">{product.name}</h2>
            <p className="text-sm text-carbon/55 mt-0.5">{product.description}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 shrink-0 rounded-full bg-white shadow flex items-center justify-center hover:bg-carbon/5 transition-colors"
          >
            <X className="w-4.5 h-4.5 text-carbon" />
          </button>
        </div>

        <div className="px-6 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <BurgerBuilder
            defaultIngredients={product.defaultIngredients}
            removedIngredients={removedIngredients}
            addedExtras={addedExtras}
          />

          {product.hasVariation && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-carbon mb-2">Selecciona:</p>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((v) => {
                  const avail = isVariationAvailable(v.id);
                  return (
                    <button
                      key={v.id}
                      disabled={!avail}
                      aria-pressed={selectedVariation?.id === v.id}
                      data-tone="brand"
                      onClick={() => {
                        setSelectedVariation(v);
                        setError('');
                      }}
                      className="chip"
                    >
                      {v.name}
                      {Number(v.additionalPrice) > 0 && ` (+${formatPrice(Number(v.additionalPrice))})`}
                      {!avail && ' (Agotado)'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.requiredSelections.map((rs) => (
            <div key={rs.id} className="mt-4">
              <p className="text-sm font-semibold text-carbon mb-2">
                {rs.label} {rs.maxSelections > 1 ? `(máx ${rs.maxSelections})` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {rs.options.map((opt) => {
                  const avail = isOptionAvailable(opt.id);
                  const selected = (selections[rs.id] || []).includes(opt.name);
                  return (
                    <button
                      key={opt.id}
                      disabled={!avail}
                      aria-pressed={selected}
                      data-tone="mint"
                      onClick={() => {
                        handleSelectionToggle(rs.id, opt.name, rs.maxSelections);
                        setError('');
                      }}
                      className="chip"
                    >
                      {opt.name}
                      {Number(opt.additionalPrice) > 0 && ` (+${formatPrice(Number(opt.additionalPrice))})`}
                      {!avail && ' (Agotado)'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product.defaultIngredients.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-carbon mb-2">
                Ingredientes (toca para quitar):
              </p>
              <div className="flex flex-wrap gap-2">
                {product.defaultIngredients.map((ing) => {
                  const isRemoved = removedIngredients.includes(ing.name);
                  return (
                    <button
                      key={ing.id}
                      aria-pressed={isRemoved}
                      data-tone="rose"
                      onClick={() => {
                        setRemovedIngredients((prev) =>
                          isRemoved ? prev.filter((r) => r !== ing.name) : [...prev, ing.name]
                        );
                      }}
                      className={`chip ${isRemoved ? 'line-through' : ''}`}
                    >
                      {ing.name}
                      {isRemoved ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.extraIngredients.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-carbon mb-2">Extras:</p>
              <div className="flex flex-wrap gap-2">
                {product.extraIngredients.map((extra) => {
                  const avail = isExtraAvailable(extra.id);
                  const isAdded = addedExtras.find((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      disabled={!avail}
                      aria-pressed={!!isAdded}
                      data-tone="mint"
                      onClick={() => {
                        setAddedExtras((prev) =>
                          isAdded ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]
                        );
                      }}
                      className="chip"
                    >
                      +{extra.name} ({formatPrice(Number(extra.basePrice))})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Quitar uno"
                className="w-10 h-10 rounded-full bg-white border border-carbon/12 flex items-center justify-center disabled:opacity-40 hover:bg-carbon/5 transition-colors"
              >
                <Minus className="w-4 h-4 text-carbon" />
              </button>
              <span className="font-bold text-lg w-6 text-center tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Agregar uno"
                className="w-10 h-10 rounded-full bg-white border border-carbon/12 flex items-center justify-center hover:bg-carbon/5 transition-colors"
              >
                <Plus className="w-4 h-4 text-carbon" />
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-rose text-sm mt-3 font-medium"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <div className="mt-4">
            <Button onClick={handleAddToCart} fullWidth size="lg">
              <span className="flex w-full items-center justify-between">
                <span>Agregar al Pedido</span>
                <span className="tabular-nums">{formatPrice(previewPrice * quantity)}</span>
              </span>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
