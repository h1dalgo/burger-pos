'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { flyToCart } from '@/lib/fly-to-cart';
import { useCartStore } from '@/store/cart-store';
import { sentenceCase } from '@/lib/category-copy';
import { canQuickAdd } from './ProductCard';
import type { FoodVariant } from './ProductVisual3D';

const Burger3D = dynamic(() => import('./burger3d/Burger3D'), { ssr: false });
const Item3D = dynamic(() => import('./burger3d/Item3D'), { ssr: false });

export interface ShowcaseSlide {
  product: Product;
  categoryName: string;
  variant: FoodVariant;
}

interface Props {
  slides: ShowcaseSlide[];
  /** Abrir el detalle (modal 3D) de un producto. */
  onOpen: (product: Product) => void;
  /** Pausar el 3D y el avance automático (ej. con un modal abierto encima). */
  paused?: boolean;
}

const AUTO_MS = 7000;
const VIEW_H = 270;

/**
 * Escaparate del menú: un producto destacado a la vez. Las hamburguesas se
 * arman solas capa por capa sobre una tabla de madera; deslizar cambia de
 * producto y avanza solo si nadie lo toca.
 */
export default function MenuShowcase({ slides, onOpen, paused = false }: Props) {
  const reduced = useReducedMotion();
  const addSimple = useCartStore((s) => s.addSimple);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [hold, setHold] = useState(false); // el usuario está mirando/tocando
  const [ready, setReady] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<(() => string | null) | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const n = slides.length;
  const i = n ? index % n : 0;
  const slide = slides[i];

  const go = (next: number, d: number) => {
    setDir(d);
    setIndex(((next % n) + n) % n);
  };
  const userAction = () => {
    // tras tocar, se detiene el avance automático un rato
    setHold(true);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setHold(false), 12000);
  };

  // Avance automático
  useEffect(() => {
    if (n < 2 || paused || hold || reduced) return;
    const t = setTimeout(() => {
      setDir(1);
      setIndex((x) => (x + 1) % n);
    }, AUTO_MS);
    return () => clearTimeout(t);
  }, [index, n, paused, hold, reduced]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    []
  );

  if (!slide) return null;
  const p = slide.product;
  const ingredients = p.defaultIngredients.map((d) => d.name);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (n < 2) return;
    if (info.offset.x < -60 || info.velocity.x < -500) {
      userAction();
      go(i + 1, 1);
    } else if (info.offset.x > 60 || info.velocity.x > 500) {
      userAction();
      go(i - 1, -1);
    }
  };

  const add = () => {
    userAction();
    if (!canQuickAdd(p)) {
      onOpen(p); // tiene opciones obligatorias: se eligen en el detalle
      return;
    }
    addSimple(p);
    flyToCart(snapshotRef.current?.() ?? null, viewRef.current?.getBoundingClientRect());
    toast.success(`${p.name} agregado al pedido`);
  };

  return (
    <section aria-roledescription="carrusel" aria-label="Destacados de la casa" className="mb-9" onPointerEnter={(e) => e.pointerType === 'mouse' && setHold(true)} onPointerLeave={(e) => e.pointerType === 'mouse' && setHold(false)}>
      <motion.div
        drag={n > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onDragEnd}
        style={{ touchAction: 'pan-y' }}
        className="relative overflow-hidden rounded-2xl border-2 border-carbon bg-card shadow-pop"
      >
        <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-burger" />
        <div className="grid sm:grid-cols-2">
          {/* Producto en 3D */}
          <div ref={viewRef} className="relative bg-cream/60" style={{ height: VIEW_H }} aria-hidden="true">
            {!ready && <div className="absolute inset-0 m-auto h-24 w-40 animate-pulse rounded-[45%] bg-carbon/10" />}
            {slide.variant === 'burger' ? (
              <Burger3D
                key="burger"
                ingredients={ingredients}
                rebuildKey={p.id}
                height={VIEW_H}
                board
                interactive={false}
                hint={false}
                paused={paused}
                onReady={() => setReady(true)}
                snapshotRef={snapshotRef}
              />
            ) : (
              <Item3D
                key="item"
                variant={slide.variant}
                name={p.name}
                description={p.description}
                height={VIEW_H}
                interactive={false}
                hint={false}
                paused={paused}
                onReady={() => setReady(true)}
                snapshotRef={snapshotRef}
              />
            )}
          </div>

          {/* Texto del producto */}
          <div className="relative flex min-h-[210px] flex-col justify-center px-5 pb-14 pt-5 sm:pb-16">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={p.id}
                custom={dir}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                aria-live="polite"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-burger-dark tabular-nums">
                  {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} · {sentenceCase(slide.categoryName)}
                </p>
                <h2 className="display mt-1 text-2xl leading-tight text-carbon">{p.name}</h2>
                <p className="mt-1.5 line-clamp-2 text-sm text-carbon/70">{p.description}</p>
                <p className="mt-3 inline-block rounded-md border-2 border-carbon bg-mustard px-2.5 py-0.5 text-lg font-bold tabular-nums text-carbon">
                  {formatPrice(Number(p.basePrice))}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => {
                      userAction();
                      onOpen(p);
                    }} className="btn btn-outline flex-1">
                    <Eye className="h-4 w-4" />
                    Ver qué lleva
                  </button>
                  <button type="button" onClick={add} className="btn btn-primary flex-1">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navegación */}
            {n > 1 && (
              <div className="absolute inset-x-5 bottom-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {slides.map((s, k) => (
                    <button
                      key={s.product.id}
                      type="button"
                      onClick={() => {
                        userAction();
                        go(k, k >= i ? 1 : -1);
                      }}
                      aria-label={`Ver ${s.product.name}`}
                      aria-current={k === i}
                      className="flex h-6 items-center"
                    >
                      <span className={`block h-2 rounded-full border border-carbon transition-all ${k === i ? 'w-6 bg-burger' : 'w-2 bg-carbon/15'}`} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => {
                      userAction();
                      go(i - 1, -1);
                    }} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-carbon bg-card hover:bg-mustard transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => {
                      userAction();
                      go(i + 1, 1);
                    }} aria-label="Siguiente" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-carbon bg-card hover:bg-mustard transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
