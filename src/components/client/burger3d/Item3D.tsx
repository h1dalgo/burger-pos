'use client';

import { useEffect, useRef } from 'react';
import { ItemScene, type ItemVariant } from './ItemScene';

export interface Item3DProps {
  variant: ItemVariant;
  /** Nombre del producto (elige el modelo: "Jarra de Jugo", "Refresco 1.5LT"...). */
  name: string;
  description?: string;
  /** Opciones elegidas (sabor, salsas). Cambian el 3D con animación. */
  choices?: string[];
  height?: number | string;
  className?: string;
  autoRotate?: boolean;
}

export default function Item3D({ variant, name, description = '', choices = [], height = 240, className, autoRotate = true }: Item3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ItemScene | null>(null);
  const key = [variant, name, description, ...choices].join('|');

  useEffect(() => {
    if (!ref.current) return;
    const scene = new ItemScene(ref.current, { autoRotate });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // Se crea una sola vez; los cambios se animan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setProduct({ variant, name, description, choices });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  return <div ref={ref} className={className} style={{ width: '100%', height, position: 'relative' }} role="img" aria-label={name} />;
}
