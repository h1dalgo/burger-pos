'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import type { Product, ProductVariation, ExtraIngredient } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useStockStore } from '@/store/stock-store';
import BurgerBuilder from './BurgerBuilder';

interface Props {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: Props) {
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
      selections: Object.fromEntries(
        Object.entries(selections).map(([key, options]) => {
          const sel = product.requiredSelections.find((rs) => rs.id === key);
          return [key, options.map((opt) => opt)];
        })
      ),
    });

    onClose();
    setSelectedVariation(null);
    setRemovedIngredients([]);
    setAddedExtras([]);
    setSelections({});
    setQuantity(1);
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-lg max-h-[90vh] bg-[#FFF8F0] rounded-t-3xl sm:rounded-3xl overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="sticky top-3 float-right z-10 mr-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center"
            >
              <X className="w-4 h-4 text-[#2B2D42]" />
            </button>

            <div className="px-6 pb-6">
              <BurgerBuilder
                defaultIngredients={product.defaultIngredients}
                removedIngredients={removedIngredients}
                addedExtras={addedExtras}
              />

              <h2 className="text-xl font-bold text-[#2B2D42]">{product.name}</h2>
              <p className="text-sm text-[#2B2D42]/60 mt-1">{product.description}</p>

              {/* Variations */}
              {product.hasVariation && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#2B2D42] mb-2">Selecciona:</p>
                  <div className="flex gap-2">
                    {product.variations.map((v) => {
                      const avail = isVariationAvailable(v.id);
                      return (
                        <button
                          key={v.id}
                          disabled={!avail}
                          onClick={() => { setSelectedVariation(v); setError(''); }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            !avail
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : selectedVariation?.id === v.id
                                ? 'border-[#E85D04] bg-[#E85D04]/10 text-[#E85D04]'
                                : 'border-gray-200 bg-white text-[#2B2D42] hover:border-[#E85D04]'
                          }`}
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

              {/* Required Selections */}
              {product.requiredSelections.map((rs) => (
                <div key={rs.id} className="mt-4">
                  <p className="text-sm font-semibold text-[#2B2D42] mb-2">
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
                          onClick={() => { handleSelectionToggle(rs.id, opt.name, rs.maxSelections); setError(''); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            !avail
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : selected
                                ? 'border-[#06D6A0] bg-[#06D6A0]/10 text-[#06D6A0]'
                                : 'border-gray-200 bg-white text-[#2B2D42] hover:border-[#06D6A0]'
                          }`}
                        >
                          {opt.name}
                          {!avail && ' (Agotado)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Default Ingredients */}
              {product.defaultIngredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#2B2D42] mb-2">Ingredientes (toca para quitar):</p>
                  <div className="flex flex-wrap gap-2">
                    {product.defaultIngredients.map((ing) => {
                      const isRemoved = removedIngredients.includes(ing.name);
                      return (
                        <button
                          key={ing.id}
                          onClick={() => {
                            setRemovedIngredients((prev) =>
                              isRemoved ? prev.filter((r) => r !== ing.name) : [...prev, ing.name]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isRemoved
                              ? 'border-[#EF476F] bg-[#EF476F]/10 text-[#EF476F] line-through'
                              : 'border-gray-200 bg-white text-[#2B2D42] hover:border-[#EF476F]'
                          }`}
                        >
                          {ing.name} {isRemoved ? '✕' : '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extra Ingredients */}
              {product.extraIngredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#2B2D42] mb-2">Extras:</p>
                  <div className="flex flex-wrap gap-2">
                    {product.extraIngredients.map((extra) => {
                      const avail = isExtraAvailable(extra.id);
                      const isAdded = addedExtras.find((e) => e.id === extra.id);
                      return (
                        <button
                          key={extra.id}
                          disabled={!avail}
                          onClick={() => {
                            setAddedExtras((prev) =>
                              isAdded ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            !avail
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isAdded
                                ? 'border-[#06D6A0] bg-[#06D6A0]/10 text-[#06D6A0]'
                                : 'border-gray-200 bg-white text-[#2B2D42] hover:border-[#06D6A0]'
                          }`}
                        >
                          +{extra.name} ({formatPrice(Number(extra.basePrice))})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4 text-[#2B2D42]" />
                  </button>
                  <span className="font-bold text-lg w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 text-[#2B2D42]" />
                  </button>
                </div>
                <p className="font-bold text-lg text-[#E85D04]">
                  {formatPrice(previewPrice * quantity)}
                </p>
              </div>

              {error && (
                <p className="text-[#EF476F] text-sm mt-2 font-medium">{error}</p>
              )}

              <button
                onClick={handleAddToCart}
                className="w-full mt-4 py-3 bg-[#E85D04] text-white font-bold rounded-xl shadow-lg hover:bg-[#d55404] transition-colors"
              >
                Agregar al Pedido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
