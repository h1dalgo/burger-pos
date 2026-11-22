'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { BurgerScene, webglAvailable } from './BurgerScene';
import { useStageLifecycle } from './useStageLifecycle';

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
  /** No se pudo mostrar el 3D en este dispositivo (sin WebGL o falla repetida): mostrar la foto. */
  onFail?: () => void;
  /** Crear el 3D después de X ms (ej. cuando termina de abrirse una ventana: sin tirones). */
  delay?: number;
  /** Otras hamburguesas para dejar preparadas en ratos libres (cambios instantáneos). */
  prewarm?: string[][];
}

export default function Burger3D({ ingredients, height = 280, className, autoRotate = true, onLayerClick, onReady, snapshotRef, highlight = null, interactive = true, theme = 'light', board = false, hint, paused = false, rebuildKey, onFail, delay = 0, prewarm }: Burger3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BurgerScene | null>(null);
  const clickRef = useRef(onLayerClick);
  const readyRef = useRef(onReady);
  const key = ingredients.join('|');
  const { gen, failed, fail, lost } = useStageLifecycle(onFail);
  const [go, setGo] = useState(delay <= 0);
  useEffect(() => {
    if (go) return;
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [go, delay]);
  const prewarmRef = useRef(prewarm);
  // lo último que se pidió, para rearmar la escena si el sistema la borra
  const latest = useRef({ ingredients, paused, highlight, autoRotate });

  useEffect(() => {
    clickRef.current = onLayerClick;
    readyRef.current = onReady;
    latest.current = { ingredients, paused, highlight, autoRotate };
    prewarmRef.current = prewarm;
  });

  useEffect(() => {
    if (!ref.current || failed || !go) return;
    if (!webglAvailable()) {
      fail();
      return;
    }
    let scene: BurgerScene;
    try {
      scene = new BurgerScene(ref.current, {
        autoRotate: latest.current.autoRotate,
        onLayerClick: onLayerClick ? (label: string) => clickRef.current?.(label) : null,
        onReady: () => {
          readyRef.current?.();
          // con el primer cuadro ya visible, se preparan las demás hamburguesas
          if (prewarmRef.current?.length) scene.prewarm(prewarmRef.current);
        },
        onContextLost: lost,
        interactive,
        theme,
        board,
        ...(hint !== undefined ? { hint } : {}),
      });
    } catch {
      fail();
      return;
    }
    sceneRef.current = scene;
    if (snapshotRef) snapshotRef.current = () => scene.snapshot();
    scene.setIngredients(latest.current.ingredients);
    if (latest.current.paused) scene.setPaused(true);
    if (latest.current.highlight) scene.setHighlight(latest.current.highlight);
    return () => {
      if (snapshotRef) snapshotRef.current = null;
      scene.dispose();
      sceneRef.current = null;
    };
    // Se crea una vez (y de nuevo solo si el sistema borró el lienzo: `gen`);
    // los cambios de ingredientes se animan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen, failed, go]);

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
