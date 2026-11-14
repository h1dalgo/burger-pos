'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { DefaultIngredient, ExtraIngredient } from '@/types';

/**
 * Objeto 3D del modal de producto (Three.js, ver ./burger3d). Se puede girar
 * y reacciona a lo que elige el cliente:
 *  - Hamburguesas: cada ingrediente entra o sale con animación.
 *  - Bebidas: botella, jarra o vaso; el sabor cambia el color del líquido.
 *  - Entradas: cesta con alitas / papas; cada salsa elegida aparece en su envase.
 *  - Postres: paleta que gira y cambia de sabor.
 */

const VIEW_HEIGHT = 240;

const placeholder = () => <div style={{ height: VIEW_HEIGHT }} />;
const Burger3D = dynamic(() => import('./burger3d/Burger3D'), { ssr: false, loading: placeholder });
const Item3D = dynamic(() => import('./burger3d/Item3D'), { ssr: false, loading: placeholder });

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

/* ------------------------------------------------------------------ */
/* Escenario: pulsos y estallido                                       */
/* ------------------------------------------------------------------ */

const BURST_COLORS = ['#ffc72c', '#d9261c', '#1b7a43', '#fffdf6'];

interface Props {
  variant: FoodVariant;
  productName?: string;
  description?: string;
  defaultIngredients: DefaultIngredient[];
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
  quantity: number;
  celebrateSeq: number;
  celebrating?: boolean;
  /** Variación y opciones elegidas (ej. "Pollo Crispy", un sabor, salsas): cambian el 3D. */
  choiceLabels?: string[];
}

export default function ProductVisual3D({
  variant,
  productName = '',
  description = '',
  defaultIngredients,
  removedIngredients,
  addedExtras,
  quantity,
  celebrateSeq,
  celebrating = false,
  choiceLabels = [],
}: Props) {
  const reduced = useReducedMotion();
  const pulse = useAnimationControls();
  const prevQty = useRef(quantity);

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
        ? { scale: [1, 1.05, 1], transition: { duration: 0.22 } }
        : up
          ? { y: [0, -13, 0], scale: [1, 1.07, 1], transition: { duration: 0.44, ease: 'easeOut' } }
          : { y: [0, 7, 0], scale: [1, 0.96, 1], transition: { duration: 0.34, ease: 'easeOut' } }
    );
  }, [quantity, reduced, pulse]);

  /* Estallido al agregar al pedido */
  useEffect(() => {
    if (celebrateSeq === 0) return;
    void pulse.start(
      reduced
        ? { scale: [1, 1.06, 1], transition: { duration: 0.28 } }
        : {
            y: [0, -28, 0],
            rotate: [0, -6, 5, 0],
            scale: [1, 1.12, 1],
            transition: { duration: 0.64, ease: 'easeOut' },
          }
    );
  }, [celebrateSeq, reduced, pulse]);

  return (
    <div className="relative w-full pt-1 pb-1" aria-hidden="true">
      <motion.div animate={pulse} className="w-full" style={{ transformOrigin: 'bottom center' }}>
        {variant === 'burger' ? (
          <Burger3D ingredients={burgerIngredients} height={VIEW_HEIGHT} />
        ) : (
          <Item3D variant={variant} name={productName} description={description} choices={choices} height={VIEW_HEIGHT} />
        )}
      </motion.div>

      {/* Contador de unidades */}
      <motion.div
        key={quantity}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 17 }}
        className="absolute top-1 left-1 rounded-full border-2 border-carbon bg-mustard px-2.5 py-1 text-xs font-bold tabular-nums text-carbon shadow-card"
        style={{ minWidth: 44, textAlign: 'center' }}
      >
        ×{quantity}
      </motion.div>

      {/* Estallido de confeti al agregar */}
      {celebrating && !reduced && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2 + 0.4;
            const d = 58 + (i % 3) * 20;
            return (
              <motion.span
                key={`${celebrateSeq}-${i}`}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(a) * d,
                  y: Math.sin(a) * d * 0.85,
                  scale: [0, 1, 0.5],
                  rotate: i % 2 ? 190 : -170,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.62, delay: i * 0.02, ease: 'easeOut' }}
                className="absolute h-2.5 w-2.5 rounded-[3px] border-2 border-carbon"
                style={{ background: BURST_COLORS[i % BURST_COLORS.length] }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
