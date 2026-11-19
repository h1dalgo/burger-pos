'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { flyToCart } from '@/lib/fly-to-cart';
import { useCartStore } from '@/store/cart-store';
import { Badge } from '@/components/ui/Badge';

interface Props {
  product: Product;
  isAvailable: boolean;
  onSelect: (product: Product) => void;
  index: number;
  entrance?: boolean;
}

/** Un producto se puede agregar con un toque si no tiene nada obligatorio que elegir. */
export const canQuickAdd = (p: Product) => !p.hasVariation && p.requiredSelections.length === 0;

export default function ProductCard({ product, isAvailable, onSelect, index, entrance = true }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const [imageFailed, setImageFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageUrl = product.imageUrl ?? '';
  const hasImage = imageUrl !== '' && !imageFailed;
  const quick = canQuickAdd(product);

  const handlePlus = () => {
    if (!isAvailable) return;
    if (!quick) {
      onSelect(product); // tiene opciones obligatorias: se eligen en el modal
      return;
    }
    // Si ya hay uno igual (sin cambios ni nota) se suma a esa línea en vez de crear otra
    const same = useCartStore
      .getState()
      .items.find(
        (it) =>
          it.product.id === product.id &&
          !it.variation &&
          !it.removedIngredients.length &&
          !it.addedExtras.length &&
          !Object.values(it.selections).some((v) => v.length) &&
          !it.note
      );
    if (same) updateQuantity(same.id, same.quantity + 1);
    else addItem({ product, variation: null, quantity: 1, removedIngredients: [], addedExtras: [], selections: {}, selectionLabels: {}, note: null });
    flyToCart(hasImage ? imageUrl : null, thumbRef.current?.getBoundingClientRect());
    toast.success(`${product.name} agregado al pedido`);
    setJustAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <motion.div
      initial={entrance ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={entrance ? { delay: Math.min(index * 0.05, 0.3), duration: 0.3 } : { duration: 0 }}
      className="relative"
    >
      <button
        onClick={() => isAvailable && onSelect(product)}
        disabled={!isAvailable}
        aria-label={`${product.name}, ${formatPrice(Number(product.basePrice))}${isAvailable ? '' : ', agotado'}`}
        className={`group w-full text-left rounded-2xl p-4 pr-16 transition-[background-color,border-color,box-shadow,transform] ${
          isAvailable
            ? 'card lift hover:shadow-pop active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
            : 'bg-carbon/5 border-2 border-carbon/25 opacity-70 cursor-not-allowed'
        }`}
      >
        {!isAvailable && (
          <div className="absolute top-3 right-3 z-10">
            <Badge tone="danger">Agotado</Badge>
          </div>
        )}

        <div className="flex items-start gap-3.5">
          <div
            ref={thumbRef}
            className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-carbon/5 border-2 border-carbon/15 flex items-center justify-center"
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                onError={() => setImageFailed(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
              />
            ) : (
              <ImageIcon className="w-7 h-7 text-carbon/25" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-carbon text-base leading-snug">{product.name}</h3>
            <p className="text-sm text-carbon/60 mt-0.5 line-clamp-2">{product.description}</p>
            <p className="inline-block bg-mustard text-carbon border-2 border-carbon rounded-md px-2 py-0.5 font-bold text-lg mt-2 tabular-nums">
              {formatPrice(Number(product.basePrice))}
            </p>
          </div>
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
      </button>

      {/* Botón "+" aparte (no anidado): agrega directo o abre las opciones */}
      {isAvailable && (
        <motion.button
          type="button"
          onClick={handlePlus}
          whileTap={{ scale: 0.86 }}
          aria-label={quick ? `Agregar ${product.name} al pedido` : `Elegir opciones de ${product.name}`}
          className={`absolute top-4 right-4 w-11 h-11 rounded-full border-2 border-carbon flex items-center justify-center shadow-card transition-colors ${
            justAdded ? 'bg-mint' : 'bg-burger hover:bg-burger-dark'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={justAdded ? 'ok' : 'plus'}
              initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, rotate: 90, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className="flex"
            >
              {justAdded ? <Check className="w-5 h-5 text-cream" /> : <Plus className="w-5 h-5 text-cream" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      )}
    </motion.div>
  );
}
