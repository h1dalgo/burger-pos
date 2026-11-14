'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { DefaultIngredient, ExtraIngredient } from '@/types';

/**
 * Objeto 3D del modal de producto. La hamburguesa es un modelo WebGL real
 * (Three.js, ver ./burger3d) que se puede girar y anima cada ingrediente que
 * entra o sale. Bebidas, entradas y postres mantienen su pieza de cilindros
 * planos con tinta de 2px — misma materia del mundo "Rótulo de Esquina".
 */

const BURGER_HEIGHT = 240;

const Burger3D = dynamic(() => import('./burger3d/Burger3D'), {
  ssr: false,
  loading: () => <div style={{ height: BURGER_HEIGHT }} />,
});

export type FoodVariant = 'burger' | 'drink' | 'starter' | 'dessert';

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function variantFromCategory(name?: string): FoodVariant {
  const n = norm(name || '');
  if (/(bebida|refresco|jugo|gaseosa|soda|batido|cafe)/.test(n)) return 'drink';
  if (/(entrada|combo|appetizer|compartir|alitas|snack)/.test(n)) return 'starter';
  if (/(postre|dessert|dulce|helado|paleta|brownie)/.test(n)) return 'dessert';
  return 'burger';
}

/* ------------------------------------------------------------------ */
/* Cilindro: cara superior elíptica + cuerpo sombreado                */
/* ------------------------------------------------------------------ */

interface CylProps {
  w: number;
  t: number;
  e: number;
  top: string;
  side: string;
  z: number;
  radius?: string;
  face?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
}

function Cyl({ w, t, e, top, side, z, radius, face, children, title }: CylProps) {
  return (
    <div className="relative" style={{ width: w, height: t, zIndex: z }} title={title}>
      <div
        className="absolute inset-0 overflow-hidden border-x-2 border-b-2 border-carbon"
        style={{ background: side, borderRadius: radius }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(26,23,18,0.04), rgba(26,23,18,0.30))',
          }}
        />
        {children}
      </div>
      <div
        className="absolute right-0 left-0 border-2 border-carbon"
        style={{ top: -e / 2, height: e, background: top, borderRadius: '50%' }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0) 62%)',
          }}
        />
        {face}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vaso de bebida                                                      */
/* ------------------------------------------------------------------ */

function DrinkCup() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Popote (detrás de la tapa) */}
      <div
        className="absolute rounded-full border-2 border-carbon bg-mustard"
        style={{
          zIndex: 15,
          top: -68,
          left: 74,
          width: 15,
          height: 82,
          transform: 'rotate(15deg)',
          transformOrigin: 'bottom center',
          background: 'linear-gradient(to right, #ffc72c 55%, #f0b400)',
        }}
      />

      {/* Tapa */}
      <Cyl w={118} t={10} e={30} top="#fffdf6" side="#fdf6e3" z={20} title="Tapa" />

      {/* Cuerpo del vaso */}
      <Cyl w={110} t={104} e={28} top="#fffdf6" side="#fdf6e3" z={10} title="Vaso">
        <div
          className="absolute rounded-full bg-cream/85"
          style={{ right: 14, top: 26, width: 11, height: 46 }}
        />
        <div className="absolute inset-x-0 bottom-6 h-11 border-y-2 border-carbon bg-burger" />
        <div
          className="absolute inset-x-0 bottom-6 h-11"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.14), rgba(26,23,18,0.18))' }}
        />
      </Cyl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Canasta de papas (entradas)                                         */
/* ------------------------------------------------------------------ */

const FRIES = [
  { h: 50, x: -46, r: -7, c: '#ffc72c' },
  { h: 62, x: -28, r: 4, c: '#f0b400' },
  { h: 55, x: -10, r: -3, c: '#ffc72c' },
  { h: 66, x: 8, r: 6, c: '#f0b400' },
  { h: 53, x: 26, r: -5, c: '#ffc72c' },
  { h: 60, x: 42, r: 8, c: '#f0b400' },
];

function FryBasket() {
  return (
    <div className="relative" style={{ width: 132, height: 56 }}>
      {/* Cuerpo de la canasta */}
      <div
        className="absolute inset-0 overflow-hidden border-x-2 border-b-2 border-carbon"
        style={{ background: '#d9261c', borderRadius: '0 0 50% 50% / 0 0 16px 16px' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(26,23,18,0.05), rgba(26,23,18,0.30))',
          }}
        />
      </div>

      {/* Papel: borde trasero */}
      <div
        className="absolute right-0 left-0 border-x-2 border-t-2 border-carbon bg-card"
        style={{ top: -20, height: 20, borderRadius: '50% 50% 0 0 / 16px 16px 0 0', zIndex: 1 }}
      />

      {/* Papas */}
      <div className="absolute right-0 left-0" style={{ top: -64, height: 88, zIndex: 2 }}>
        {FRIES.map((f, i) => (
          <div
            key={i}
            className="absolute rounded-sm border-2 border-carbon"
            style={{
              left: `calc(50% + ${f.x}px)`,
              bottom: 16,
              width: 14,
              height: f.h,
              background: `linear-gradient(to right, ${f.c} 58%, rgba(26,23,18,0.22))`,
              transform: `translateX(-50%) rotate(${f.r}deg)`,
              transformOrigin: 'bottom center',
            }}
          />
        ))}
      </div>

      {/* Papel: borde frontal */}
      <div
        className="absolute right-0 left-0 border-x-2 border-b-2 border-carbon bg-card"
        style={{ top: 0, height: 20, borderRadius: '0 0 50% 50% / 0 0 16px 16px', zIndex: 3 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paleta (postres)                                                    */
/* ------------------------------------------------------------------ */

const SPRINKLES = [
  { x: 44, y: 30, c: '#d9261c' },
  { x: 60, y: 56, c: '#1b7a43' },
  { x: 30, y: 66, c: '#fffdf6' },
  { x: 52, y: 84, c: '#d9261c' },
  { x: 26, y: 40, c: '#1b7a43' },
];

function Popsicle() {
  return (
    <div className="relative flex flex-col items-center" style={{ width: 100 }}>
      {/* Palito */}
      <div
        className="absolute"
        style={{
          zIndex: 0,
          top: 92,
          left: '50%',
          width: 20,
          height: 56,
          transform: 'translateX(-50%)',
          background: '#f0b400',
          border: '2px solid #1a1712',
          borderRadius: '0 0 8px 8px',
        }}
      />

      {/* Cuerpo de la paleta */}
      <div
        className="relative overflow-hidden border-2 border-carbon bg-mustard"
        style={{ width: 96, height: 118, zIndex: 10, borderRadius: 46 }}
        title="Paleta"
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(26,23,18,0.24))',
          }}
        />
        <div
          className="absolute rounded-full bg-cream/80"
          style={{ left: 15, top: 18, width: 12, height: 44, transform: 'rotate(10deg)' }}
        />
        {SPRINKLES.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{ left: s.x, top: s.y, width: 9, height: 9, background: s.c }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Escenario: flotación, pulsos y estallido                            */
/* ------------------------------------------------------------------ */

const BURST_COLORS = ['#ffc72c', '#d9261c', '#1b7a43', '#fffdf6'];

interface Props {
  variant: FoodVariant;
  defaultIngredients: DefaultIngredient[];
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
  quantity: number;
  celebrateSeq: number;
  celebrating?: boolean;
  /** Variación y opciones elegidas (ej. "Pollo Crispy", "150gr de Carne"): cambian la proteína en 3D. */
  choiceLabels?: string[];
}

export default function ProductVisual3D({
  variant,
  defaultIngredients,
  removedIngredients,
  addedExtras,
  quantity,
  celebrateSeq,
  celebrating = false,
  choiceLabels = [],
}: Props) {
  const reduced = useReducedMotion();
  const idle = useAnimationControls();
  const pulse = useAnimationControls();
  const prevQty = useRef(quantity);
  const isBurger = variant === 'burger';

  const choicesKey = choiceLabels.join('|');
  const burgerIngredients = useMemo(
    () => [
      ...(choicesKey ? choicesKey.split('|') : []),
      ...defaultIngredients.filter((d) => !removedIngredients.includes(d.name)).map((d) => d.name),
      ...addedExtras.map((e) => e.name),
    ],
    [choicesKey, defaultIngredients, removedIngredients, addedExtras]
  );

  /* Flotación reposo (se detiene con la pestaña oculta o reduced-motion).
     La hamburguesa 3D ya gira sola, así que no flota. */
  useEffect(() => {
    if (reduced || isBurger) return;
    const loop = () =>
      idle.start({
        y: [0, -5, 0],
        rotate: [0, -1.4, 1.4, 0],
        transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' },
      });
    void loop();
    const onVis = () => {
      if (document.hidden) idle.stop();
      else void loop();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      idle.stop();
    };
  }, [reduced, idle, isBurger]);

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
    <div
      className={`relative flex w-full flex-col items-center justify-end ${
        isBurger ? 'pt-1 pb-1' : 'min-h-[196px] pt-2 pb-3'
      }`}
      aria-hidden="true"
    >
      <motion.div
        animate={idle}
        className={`relative ${isBurger ? 'w-full' : ''}`}
        style={{ transformOrigin: 'bottom center' }}
      >
        <motion.div
          animate={pulse}
          className={`flex flex-col items-center ${isBurger ? 'w-full' : ''}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          {isBurger && <Burger3D ingredients={burgerIngredients} height={BURGER_HEIGHT} />}
          {variant === 'drink' && <DrinkCup />}
          {variant === 'starter' && <FryBasket />}
          {variant === 'dessert' && <Popsicle />}
          {!isBurger && (
            <div
              className={`h-4 w-44 rounded-full bg-carbon/10 ${variant === 'dessert' ? 'mt-6' : '-mt-2'}`}
            />
          )}
        </motion.div>

        {/* Contador de unidades */}
        <motion.div
          key={quantity}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 17 }}
          className={`absolute ${isBurger ? 'top-1 left-1' : '-top-6 -left-14'} rounded-full border-2 border-carbon bg-mustard px-2.5 py-1 text-xs font-bold tabular-nums text-carbon shadow-card`}
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
      </motion.div>
    </div>
  );
}
