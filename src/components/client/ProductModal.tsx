'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { X, Minus, Plus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Product, ProductVariation, ExtraIngredient, CartItem } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useStockStore } from '@/store/stock-store';
import { Button } from '@/components/ui/Button';
import { AnimatedPrice } from '@/components/ui/AnimatedPrice';
import { PriceBs } from '@/components/ui/PriceBs';
import { flyToCart } from '@/lib/fly-to-cart';
import ProductVisual3D, { variantFromCategory } from './ProductVisual3D';

interface Props {
  product: Product;
  categoryName?: string;
  onClose: () => void;
  /** Si viene, el modal edita ese producto del carrito en vez de agregar uno nuevo. */
  editItem?: CartItem | null;
  /** Se muestra encima de otra hoja (ej. el carrito). */
  stacked?: boolean;
}

export default function ProductModal({ product, categoryName, onClose, editItem = null, stacked = false }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const replaceItem = useCartStore((s) => s.replaceItem);
  const getItemPrice = useCartStore((s) => s.getItemPrice);
  const isVariationAvailable = useStockStore((s) => s.isVariationAvailable);
  const isOptionAvailable = useStockStore((s) => s.isOptionAvailable);
  const isExtraAvailable = useStockStore((s) => s.isExtraAvailable);

  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(editItem?.variation ?? null);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>(editItem?.removedIngredients ?? []);
  const [addedExtras, setAddedExtras] = useState<ExtraIngredient[]>(editItem?.addedExtras ?? []);
  const [selections, setSelections] = useState<Record<string, string[]>>(editItem?.selections ?? {});
  const [quantity, setQuantity] = useState(editItem?.quantity ?? 1);
  const [note, setNote] = useState(editItem?.note ?? '');
  const [error, setError] = useState('');
  const [celebrateSeq, setCelebrateSeq] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const dragControls = useDragControls();

  /** Resalta en 3D el ingrediente del chip bajo el mouse (o con foco de teclado). */
  const hoverProps = (name: string, active: boolean) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && active && setHighlight(name),
    onPointerLeave: () => setHighlight((h) => (h === name ? null : h)),
    onFocus: () => active && setHighlight(name),
    onBlur: () => setHighlight((h) => (h === name ? null : h)),
  });

  /** Tocar un ingrediente en la hamburguesa 3D lo quita (base) o lo descarta (extra). */
  const handleIngredientTap = useCallback(
    (name: string) => {
      setHighlight(null);
      if (product.defaultIngredients.some((d) => d.name === name)) {
        setRemovedIngredients((prev) => (prev.includes(name) ? prev : [...prev, name]));
      } else {
        setAddedExtras((prev) => {
          const i = prev.findIndex((e) => e.name === name);
          return i < 0 ? prev : prev.filter((_, k) => k !== i);
        });
      }
      if (typeof navigator !== 'undefined') navigator.vibrate?.(10);
    },
    [product.defaultIngredients]
  );

  /** Arrastrar la hoja hacia abajo la cierra (si se suelta lejos o rápido). */
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || (info.velocity.y > 650 && info.offset.y > 60)) onClose();
  };

  const variant = variantFromCategory(categoryName);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

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
      // opción única: tocar otra la reemplaza (como un radio button)
      if (max === 1) return { ...prev, [selectionId]: [optionName] };
      if (current.length >= max) return prev;
      return { ...prev, [selectionId]: [...current, optionName] };
    });
  };

  const handleAddToCart = useCallback(() => {
    if (celebrating) return;
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

    const params = {
      product,
      variation: selectedVariation,
      quantity,
      removedIngredients,
      addedExtras,
      selections,
      selectionLabels: Object.fromEntries(product.requiredSelections.map((rs) => [rs.id, rs.label])),
      note,
    };

    if (editItem) {
      replaceItem(editItem.id, params);
      toast.success('Cambios guardados');
      setCelebrating(true);
      closeTimer.current = setTimeout(() => {
        setCelebrating(false);
        onClose();
      }, 250);
      return;
    }

    addItem(params);

    // El producto "vuela" desde el visor 3D hasta el botón del carrito.
    flyToCart(snapshotRef.current?.() ?? null, heroRef.current?.getBoundingClientRect());
    toast.success(`${product.name} agregado al pedido`);
    setCelebrating(true);
    setCelebrateSeq((s) => s + 1);
    closeTimer.current = setTimeout(() => {
      setCelebrating(false);
      onClose();
    }, 700);
  }, [celebrating, product, selectedVariation, quantity, removedIngredients, addedExtras, selections, note, addItem, replaceItem, editItem, onClose]);

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
  const missingChoice =
    product.hasVariation && !selectedVariation
      ? 'Elige una opción'
      : product.requiredSelections.find((rs) => !(selections[rs.id] || []).length)?.label;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 ${stacked ? 'z-[60]' : 'z-50'} flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-[3px]`}
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
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={handleDragEnd}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[calc(100%_-_8rem)] bg-card border-t border-carbon/10 sm:border rounded-t-[1.75rem] sm:rounded-[1.75rem] overflow-y-auto overscroll-contain"
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 pt-5 pb-3 bg-card rounded-t-[1.75rem] cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => dragControls.start(e)}
        >
          {/* asa para deslizar y cerrar (móvil) */}
          <span aria-hidden="true" className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-carbon/20 sm:hidden" />
          <div className="min-w-0">
            <h2 className="display text-[1.75rem] leading-[1.1] text-carbon">{product.name}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-carbon/60">{product.description}</p>
            {!!product.allergens?.length && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-carbon/60">
                <span className="font-semibold text-carbon/75">Contiene:</span>
                {product.allergens.map((a) => (
                  <span key={a} className="rounded-full border border-carbon/15 px-2 py-0.5">
                    {a}
                  </span>
                ))}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 shrink-0 rounded-full border border-carbon/15 flex items-center justify-center transition-colors hover:bg-carbon/[0.06]"
          >
            <X className="w-4.5 h-4.5 text-carbon" />
          </button>
        </div>

        <div ref={heroRef} className="px-4 sm:px-6 pt-1">
          <ProductVisual3D
            variant={variant}
            productName={product.name}
            description={product.description}
            imageUrl={product.imageUrl}
            snapshotRef={snapshotRef}
            highlight={highlight}
            onIngredientTap={variant === 'burger' ? handleIngredientTap : undefined}
            defaultIngredients={product.defaultIngredients}
            removedIngredients={removedIngredients}
            addedExtras={addedExtras}
            quantity={quantity}
            celebrateSeq={celebrateSeq}
            choiceLabels={[
              ...(selectedVariation ? [selectedVariation.name] : []),
              ...Object.values(selections).flat(),
            ]}
          />
        </div>

        <div className="px-6 pb-5">

          {product.hasVariation && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-carbon mb-2 flex items-center gap-2">
                Selecciona:
                {!selectedVariation && <RequiredTag />}
              </p>
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
              <p className="text-sm font-semibold text-carbon mb-2 flex flex-wrap items-center gap-x-2">
                {rs.label} {rs.maxSelections > 1 ? `(máx ${rs.maxSelections})` : ''}
                {!(selections[rs.id] || []).length && <RequiredTag />}
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
                      {...hoverProps(ing.name, !isRemoved)}
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
                      {...hoverProps(extra.name, !!isAdded)}
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

          <div className="mt-4">
            <label htmlFor="item-note" className="text-sm font-semibold text-carbon mb-2 block">
              Nota para la cocina:
            </label>
            <textarea
              id="item-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Sin cebolla extra, bien tostado..."
              rows={2}
              maxLength={300}
              className="field field-textarea w-full"
            />
          </div>

        </div>

        {/* Barra fija: cantidad + agregar, siempre visible */}
        <div
          className="sticky bottom-0 z-10 border-t-2 border-carbon bg-card/95 backdrop-blur-xl px-4 sm:px-6 pt-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-rose text-sm mb-2 font-medium"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-carbon/15 p-1">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Quitar uno"
                className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-mustard transition-colors"
              >
                <Minus className="w-4 h-4 text-carbon" />
              </motion.button>
              <span className="font-bold text-lg w-6 text-center tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Agregar uno"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-mustard transition-colors"
              >
                <Plus className="w-4 h-4 text-carbon" />
              </motion.button>
            </div>
            <Button onClick={handleAddToCart} size="lg" disabled={celebrating} className="flex-1 min-w-0">
              <span className="flex w-full items-center justify-between gap-3">
                <span className="truncate">
                  {celebrating
                    ? editItem
                      ? '¡Guardado!'
                      : '¡Agregado!'
                    : missingChoice
                      ? choicePrompt(missingChoice)
                      : editItem
                        ? 'Guardar cambios'
                        : (
                            <>
                              Agregar<span className="hidden min-[420px]:inline"> al pedido</span>
                            </>
                          )}
                </span>
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  <AnimatedPrice value={previewPrice * quantity} />
                  <PriceBs usd={previewPrice * quantity} className="text-[10px] font-semibold opacity-65" />
                </span>
              </span>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** "Elige el sabor" se muestra tal cual; "Salsas extras" → "Elige: Salsas extras". */
function choicePrompt(label: string) {
  return /^(elige|selecciona|escoge)/i.test(label.trim()) ? label : `Elige: ${label}`;
}

/** Etiqueta para grupos de opciones obligatorios aún sin elegir. */
function RequiredTag() {
  return (
    <span className="rounded-full border border-burger/40 bg-burger/10 px-2 py-px text-[10px] font-semibold uppercase tracking-[0.14em] text-burger-dark">
      Obligatorio
    </span>
  );
}
