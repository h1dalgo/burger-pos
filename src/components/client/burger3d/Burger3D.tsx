'use client';

import { useEffect, useRef } from 'react';
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
}

export default function Burger3D({ ingredients, height = 280, className, autoRotate = true, onLayerClick }: Burger3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BurgerScene | null>(null);
  const clickRef = useRef(onLayerClick);
  const key = ingredients.join('|');

  useEffect(() => {
    clickRef.current = onLayerClick;
  }, [onLayerClick]);

  useEffect(() => {
    if (!ref.current) return;
    const scene = new BurgerScene(ref.current, {
      autoRotate,
      onLayerClick: onLayerClick ? (label: string) => clickRef.current?.(label) : null,
    });
    sceneRef.current = scene;
    scene.setIngredients(ingredients);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // Se crea una sola vez; los cambios de ingredientes se animan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setIngredients(ingredients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  return <div ref={ref} className={className} style={{ width: '100%', height, position: 'relative' }} role="img" aria-label="Hamburguesa 3D" />;
}
