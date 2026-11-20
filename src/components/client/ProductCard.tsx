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
import { cldUrl } from '@/lib/cloudinary';
import { PriceBs } from '@/components/ui/PriceBs';
import SpotlightCard from '@/components/reactbits/SpotlightCard';

interface Props {
  product: Product;
  isAvailable: boolean;
  onSelect: (product: Product) => void;
  /** Ya no se usan: la entrada la hace el menú con GSAP (data-reveal). */
  index?: number;
  entrance?: boolean;
}

/** Luz dorada que sigue al dedo/cursor sobre la tarjeta (React Bits). */
const SPOTLIGHT_STYLE = {
  '--spotlight-card-surface': 'var(--color-card)',
  '--spotlight-card-shadow': 'var(--shadow-card)',
  '--spotlight-card-border': 'rgb(242 233 218 / 0.1)',
} as React.CSSProperties;

/** Un producto se puede agregar con un toque si no tiene nada obligatorio que elegir. */
export const canQuickAdd = (p: Product) => !p.hasVariation && p.requiredSelections.length === 0;

export default function ProductCard({ product, isAvailable, onSelect }: Props) {
  const addSimple = useCartStore((s) => s.addSimple);
  const [imageFailed, setImageFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageUrl = cldUrl(product.imageUrl, { w: 80, h: 80 }); // miniatura al tamaño justo
  const hasImage = imageUrl !== '' && !imageFailed;
  const quick = canQuickAdd(product);

  const handlePlus = () => {
    if (!isAvailable) return;
    if (!quick) {
      onSelect(product); // tiene opciones obligatorias: se eligen en el modal
      return;
    }
    addSimple(product); // si ya hay uno igual, suma a esa línea
    flyToCart(hasImage ? imageUrl : null, thumbRef.current?.getBoundingClientRect());
    toast.success(`${product.name} agregado al pedido`);
    setJustAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div data-reveal className="relative">
      <Shell available={isAvailable}>
      <button
        onClick={() => isAvailable && onSelect(product)}
        disabled={!isAvailable}
        className={`group block w-full text-left rounded-[1.25rem] p-4 pr-16 ${
          isAvailable
            ? 'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985]'
            : 'border border-carbon/10 bg-carbon/[0.03] opacity-60 cursor-not-allowed'
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
            className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-carbon/5 ring-1 ring-carbon/10 flex items-center justify-center"
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                width={80}
                height={80}
                decoding="async"
                onError={() => setImageFailed(true)}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:group-hover:scale-105"
              />
            ) : (
              <ImageIcon className="w-7 h-7 text-carbon/25" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="display text-[1.15rem] leading-snug text-carbon">
              {product.name}
              {!isAvailable && <span className="sr-only"> (agotado)</span>}
            </h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-carbon/55">{product.description}</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="price text-lg">{formatPrice(Number(product.basePrice))}</span>
              <PriceBs usd={Number(product.basePrice)} className="text-[11px] font-medium text-carbon/45" />
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
      </Shell>

      {/* Botón "+" aparte (no anidado): agrega directo o abre las opciones */}
      {isAvailable && (
        <motion.button
          type="button"
          onClick={handlePlus}
          whileTap={{ scale: 0.86 }}
          aria-label={quick ? `Agregar ${product.name} al pedido` : `Elegir opciones de ${product.name}`}
          className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            justAdded
              ? 'bg-mint'
              : 'border border-burger/50 bg-burger/10 text-burger-dark hover:bg-burger hover:text-cream'
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
              {justAdded ? <Check className="w-5 h-5 text-cream" /> : <Plus className="w-5 h-5" strokeWidth={1.75} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  );
}

/** Tarjeta con luz dorada (React Bits) si está disponible; simple si está agotada. */
function Shell({ available, children }: { available: boolean; children: React.ReactNode }) {
  if (!available) return <>{children}</>;
  return (
    <SpotlightCard theme="dark" spotlightColor="#d8ad66" intensity={0.16} borderGlow={0.6} spotlightSize={220} proximity={0} className="lift p-0! rounded-[1.25rem]!" style={SPOTLIGHT_STYLE}>
      {children}
    </SpotlightCard>
  );
}
