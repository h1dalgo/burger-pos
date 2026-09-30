'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Plus, ImageOff } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductVariation, ExtraIngredient, CartItem } from './shared';
import { calcItemPrice } from './shared';

interface Props {
  product: Product;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'id'>) => void;
}

export default function WaiterProductModal({ product, onClose, onAdd }: Props) {
  const [variation, setVariation] = useState<ProductVariation | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [extras, setExtras] = useState<ExtraIngredient[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
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

  const toggleSelection = (rsId: string, optName: string, max: number) => {
    setSelections((prev) => {
      const current = prev[rsId] || [];
      if (current.includes(optName)) return { ...prev, [rsId]: current.filter((o) => o !== optName) };
      if (current.length >= max) return prev;
      return { ...prev, [rsId]: [...current, optName] };
    });
    setError('');
  };

  const handleAdd = () => {
    if (product.hasVariation && !variation) {
      setError('Selecciona una variación');
      return;
    }
    for (const rs of product.requiredSelections) {
      if ((selections[rs.id] || []).length < 1) {
        setError(`Selecciona: ${rs.label}`);
        return;
      }
    }
    setError('');
    onAdd({
      product,
      variation,
      quantity,
      removedIngredients: removed,
      addedExtras: extras,
      selections,
      note,
    });
  };

  const unitPrice = calcItemPrice({
    product,
    variation,
    quantity,
    removedIngredients: removed,
    addedExtras: extras,
    selections,
    note,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Personalizar ${product.name}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[85vh] bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-pop"
      >
        <div className="sticky top-0 bg-card z-10 px-5 pt-4 pb-3 border-b border-white/8 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="display text-xl text-white leading-tight">{product.name}</h2>
            <p className="text-sm text-white/50 line-clamp-2">{product.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 shrink-0 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {product.imageUrl && !imageBroken && (
            <div className="w-full h-44 rounded-xl overflow-hidden bg-black/30">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImageBroken(true)}
              />
            </div>
          )}
          {!product.imageUrl && (
            <div className="w-full h-24 rounded-xl bg-white/4 flex items-center justify-center text-white/25">
              <ImageOff className="w-6 h-6" />
            </div>
          )}

          {product.hasVariation && (
            <div>
              <p className="text-sm font-semibold text-white/70 mb-2">Selecciona:</p>
              <div className="flex gap-2 flex-wrap">
                {product.variations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={variation?.id === v.id}
                    onClick={() => {
                      setVariation(v);
                      setError('');
                    }}
                    className="chip"
                    data-tone={variation?.id === v.id ? 'brand' : undefined}
                  >
                    {v.name}
                    {Number(v.additionalPrice) > 0 ? ` (+${formatPrice(Number(v.additionalPrice))})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.requiredSelections.map((rs) => (
            <div key={rs.id}>
              <p className="text-sm font-semibold text-white/70 mb-2">
                {rs.label}
                {rs.maxSelections > 1 ? ` (máx ${rs.maxSelections})` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {rs.options.map((opt) => {
                  const sel = (selections[rs.id] || []).includes(opt.name);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => toggleSelection(rs.id, opt.name, rs.maxSelections)}
                      className="chip"
                      data-tone={sel ? 'mint' : undefined}
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product.defaultIngredients.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white/70 mb-2">Ingredientes (toca para quitar):</p>
              <div className="flex flex-wrap gap-2">
                {product.defaultIngredients.map((ing) => {
                  const isRemoved = removed.includes(ing.name);
                  return (
                    <button
                      key={ing.id}
                      type="button"
                      aria-pressed={isRemoved}
                      onClick={() =>
                        setRemoved((prev) =>
                          isRemoved ? prev.filter((r) => r !== ing.name) : [...prev, ing.name]
                        )
                      }
                      className="chip"
                      data-tone={isRemoved ? 'rose' : undefined}
                    >
                      {ing.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.extraIngredients.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white/70 mb-2">Extras:</p>
              <div className="flex flex-wrap gap-2">
                {product.extraIngredients.map((extra) => {
                  const added = extras.find((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      aria-pressed={!!added}
                      onClick={() =>
                        setExtras((prev) =>
                          added ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]
                        )
                      }
                      className="chip"
                      data-tone={added ? 'mint' : undefined}
                    >
                      +{extra.name} ({formatPrice(Number(extra.basePrice))})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-white/70 mb-2 block">Nota:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Sin cebolla extra, bien tostado..."
              rows={2}
              className="field-dark field-textarea w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4 text-white" />
              </button>
              <span className="font-bold text-lg text-white w-6 text-center tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
            <span className="font-bold text-lg text-mustard tabular-nums">
              {formatPrice(unitPrice * quantity)}
            </span>
          </div>

          {error && (
            <p className="text-rose text-sm font-semibold" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-white/8 bg-card pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={handleAdd} className="btn btn-primary w-full h-12">
            {`Agregar al Pedido — ${formatPrice(unitPrice * quantity)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
