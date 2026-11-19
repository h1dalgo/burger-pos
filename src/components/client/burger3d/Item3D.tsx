'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
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
  /** Se llama cuando el primer cuadro ya está dibujado. */
  onReady?: () => void;
  /** Recibe una función que devuelve un PNG del cuadro actual. */
  snapshotRef?: MutableRefObject<(() => string | null) | null>;
}

export default function Item3D({ variant, name, description = '', choices = [], height = 240, className, autoRotate = true, onReady, snapshotRef }: Item3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ItemScene | null>(null);
  const readyRef = useRef(onReady);
  const key = [variant, name, description, ...choices].join('|');

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!ref.current) return;
    const scene = new ItemScene(ref.current, { autoRotate, onReady: () => readyRef.current?.() });
    sceneRef.current = scene;
    if (snapshotRef) snapshotRef.current = () => scene.snapshot();
    return () => {
      if (snapshotRef) snapshotRef.current = null;
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
