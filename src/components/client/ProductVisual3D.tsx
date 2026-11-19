'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { DefaultIngredient, ExtraIngredient } from '@/types';
import { cldUrl } from '@/lib/cloudinary';

/**
 * Objeto 3D del modal de producto (Three.js, ver ./burger3d). Se puede girar
 * y reacciona a lo que elige el cliente:
 *  - Hamburguesas: cada ingrediente entra o sale con animación.
 *  - Bebidas: botella, jarra o vaso; el sabor cambia el color del líquido.
 *  - Entradas: cesta con alitas / papas; cada salsa elegida aparece en su envase.
 *  - Postres: paleta que gira y cambia de sabor.
 *
 * Mientras el 3D se prepara se muestra la foto del producto (difuminada) o una
 * silueta, y se hace un fundido cuando ya hay imagen.
 */

const Burger3D = dynamic(() => import('./burger3d/Burger3D'), { ssr: false });
const Item3D = dynamic(() => import('./burger3d/Item3D'), { ssr: false });

export type FoodVariant = 'burger' | 'drink' | 'starter' | 'dessert';

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function variantFromCategory(name?: string): FoodVariant {
  const n = norm(name || '');
  if (/(bebida|refresco|jugo|gaseosa|soda|batido|cafe)/.test(n)) return 'drink';
  if (/(entrada|combo|appetizer|compartir|alitas|snack)/.test(n)) return 'starter';
  if (/(postre|dessert|dulce|helado|paleta|brownie)/.test(n)) return 'dessert';
  return 'burger';
}

interface Props {
  variant: FoodVariant;
  productName?: string;
  description?: string;
  /** Foto del producto: se usa como marcador mientras carga el 3D. */
  imageUrl?: string | null;
  defaultIngredients: DefaultIngredient[];
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
  quantity: number;
  celebrateSeq: number;
  /** Variación y opciones elegidas (ej. "Pollo Crispy", un sabor, salsas): cambian el 3D. */
  choiceLabels?: string[];
  height?: number;
  /** Recibe una función que devuelve un PNG del 3D (para "volar al carrito"). */
  snapshotRef?: MutableRefObject<(() => string | null) | null>;
  /** Ingrediente a resaltar en la hamburguesa (chip bajo el mouse). */
  highlight?: string | null;
  /** Tocar un ingrediente en la hamburguesa 3D (para quitarlo). */
  onIngredientTap?: (name: string) => void;
}

export default function ProductVisual3D({
  variant,
  productName = '',
  description = '',
  imageUrl,
  defaultIngredients,
  removedIngredients,
  addedExtras,
  quantity,
  celebrateSeq,
  choiceLabels = [],
  height = 280,
  snapshotRef,
  highlight = null,
  onIngredientTap,
}: Props) {
  const reduced = useReducedMotion();
  const pulse = useAnimationControls();
  const prevQty = useRef(quantity);
  const [ready, setReady] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const choicesKey = choiceLabels.join('|');
  const choices = useMemo(() => (choicesKey ? choicesKey.split('|') : []), [choicesKey]);
  const burgerIngredients = useMemo(
    () => [
      ...choices,
      ...defaultIngredients.filter((d) => !removedIngredients.includes(d.name)).map((d) => d.name),
      ...addedExtras.map((e) => e.name),
    ],
    [choices, defaultIngredients, removedIngredients, addedExtras]
  );

  /* Pop al cambiar la cantidad (sube: brinco; baja: se hunde) */
  useEffect(() => {
    if (prevQty.current === quantity) return;
    const up = quantity > prevQty.current;
    prevQty.current = quantity;
    void pulse.start(
      reduced
        ? { scale: [1, 1.04, 1], transition: { duration: 0.22 } }
        : up
          ? { y: [0, -10, 0], scale: [1, 1.05, 1], transition: { duration: 0.42, ease: 'easeOut' } }
          : { y: [0, 6, 0], scale: [1, 0.97, 1], transition: { duration: 0.32, ease: 'easeOut' } }
    );
  }, [quantity, reduced, pulse]);

  /* Al agregar al pedido el producto "sale volando" (lib/fly-to-cart): aquí se encoge y se atenúa. */
  useEffect(() => {
    if (celebrateSeq === 0) return;
    void pulse.start(
      reduced
        ? { opacity: [1, 0.6, 1], transition: { duration: 0.3 } }
        : { scale: [1, 0.88], opacity: [1, 0.25], transition: { duration: 0.28, ease: 'easeIn' } }
    );
  }, [celebrateSeq, reduced, pulse]);

  const showPhoto = !!imageUrl && !photoFailed;
  const onReady = () => setReady(true);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-carbon bg-card shadow-card"
      style={{ height }}
      aria-hidden="true"
    >
      {/* Marcador mientras carga el 3D */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="placeholder"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cldUrl(imageUrl, { w: 320, quality: 'auto:low' })}
                alt=""
                onError={() => setPhotoFailed(true)}
                className="h-full w-full scale-110 object-cover opacity-70 blur-md"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-20 w-36 animate-pulse rounded-[45%] bg-carbon/10" />
                <div className="h-3 w-28 animate-pulse rounded-full bg-carbon/10" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="h-full w-full"
        style={{ opacity: ready ? 1 : 0, transition: reduced ? undefined : 'opacity 0.45s ease-out' }}
      >
      <motion.div animate={pulse} className="h-full w-full" style={{ transformOrigin: 'center 70%' }}>
        {variant === 'burger' ? (
          <Burger3D
            ingredients={burgerIngredients}
            height={height}
            onReady={onReady}
            snapshotRef={snapshotRef}
            highlight={highlight}
            onLayerClick={onIngredientTap}
          />
        ) : (
          <Item3D
            variant={variant}
            name={productName}
            description={description}
            choices={choices}
            height={height}
            onReady={onReady}
            snapshotRef={snapshotRef}
          />
        )}
      </motion.div>
      </div>

      {/* Contador de unidades */}
      <motion.div
        key={quantity}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 17 }}
        className="absolute top-2.5 left-2.5 rounded-full border-2 border-carbon bg-mustard px-2.5 py-1 text-xs font-bold tabular-nums text-carbon shadow-card"
        style={{ minWidth: 44, textAlign: 'center' }}
      >
        ×{quantity}
      </motion.div>
    </div>
  );
}
