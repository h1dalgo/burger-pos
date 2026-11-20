'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { BurgerScene } from './BurgerScene';

export interface Burger3DProps {
  /** Ingredientes activos (los base que no se quitaron + los extras elegidos). Ej: ['Queso Cheddar', '+Tocino ($1.00)'] */
  ingredients: string[];
  /** Alto del visor. Por defecto 280px. */
  height?: number | string;
  className?: string;
  autoRotate?: boolean;
  /** Si se pasa, tocar un ingrediente en 3D lo devuelve (útil para quitarlo con un toque). */
  onLayerClick?: (label: string) => void;
  /** Se llama cuando el primer cuadro ya está dibujado. */
  onReady?: () => void;
  /** Recibe una función que devuelve un PNG del cuadro actual. */
  snapshotRef?: MutableRefObject<(() => string | null) | null>;
  /** Nombre del ingrediente a resaltar (ej. el chip bajo el mouse). */
  highlight?: string | null;
  /** 'dark' = vitrina oscura con el producto iluminado. */
  theme?: 'light' | 'dark';
  /** false = no se gira con el dedo (escaparate). */
  interactive?: boolean;
  /** Tabla de madera bajo la hamburguesa. */
  board?: boolean;
  /** Texto de ayuda (false para ocultarlo). */
  hint?: string | false;
  /** Pausa el dibujo (ej. con otra ventana 3D encima). */
  paused?: boolean;
  /** Al cambiar, la hamburguesa se vuelve a armar desde cero. */
  rebuildKey?: string | number;
}

export default function Burger3D({ ingredients, height = 280, className, autoRotate = true, onLayerClick, onReady, snapshotRef, highlight = null, interactive = true, theme = 'light', board = false, hint, paused = false, rebuildKey }: Burger3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BurgerScene | null>(null);
  const clickRef = useRef(onLayerClick);
  const readyRef = useRef(onReady);
  const key = ingredients.join('|');

  useEffect(() => {
    clickRef.current = onLayerClick;
    readyRef.current = onReady;
  }, [onLayerClick, onReady]);

  useEffect(() => {
    if (!ref.current) return;
    const scene = new BurgerScene(ref.current, {
      autoRotate,
      onLayerClick: onLayerClick ? (label: string) => clickRef.current?.(label) : null,
      onReady: () => readyRef.current?.(),
      interactive,
      theme,
      board,
      ...(hint !== undefined ? { hint } : {}),
    });
    sceneRef.current = scene;
    if (snapshotRef) snapshotRef.current = () => scene.snapshot();
    scene.setIngredients(ingredients);
    return () => {
      if (snapshotRef) snapshotRef.current = null;
      scene.dispose();
      sceneRef.current = null;
    };
    // Se crea una sola vez; los cambios de ingredientes se animan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconstrucción desde cero (va antes que el cambio normal de ingredientes)
  const lastRebuild = useRef(rebuildKey);
  useEffect(() => {
    if (lastRebuild.current === rebuildKey) return;
    lastRebuild.current = rebuildKey;
    sceneRef.current?.rebuild(ingredients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebuildKey]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    sceneRef.current?.setIngredients(ingredients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    sceneRef.current?.setHighlight(highlight);
  }, [highlight]);

  return <div ref={ref} className={className} style={{ width: '100%', height, position: 'relative' }} role="img" aria-label="Hamburguesa 3D" />;
}
