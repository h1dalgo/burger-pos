'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ciclo de vida del 3D frente a fallas del dispositivo:
 * - `fail()`: no hay WebGL o no se pudo crear → el componente padre muestra la foto.
 * - `lost()`: el sistema liberó la memoria gráfica (lienzo en negro) → se arma
 *   de nuevo con un lienzo nuevo (subiendo `gen`). Si pasa más de 3 veces en un
 *   minuto, se rinde y muestra la foto para no gastar batería.
 */
export function useStageLifecycle(onFail?: () => void) {
  const [gen, setGen] = useState(0);
  const [failed, setFailed] = useState(false);
  const losses = useRef<number[]>([]);
  const failRef = useRef(onFail);

  useEffect(() => {
    failRef.current = onFail;
  }, [onFail]);

  const fail = useCallback(() => {
    // fuera del render/efecto actual
    setTimeout(() => {
      setFailed(true);
      failRef.current?.();
    }, 0);
  }, []);

  const lost = useCallback(() => {
    const now = Date.now();
    losses.current = losses.current.filter((t) => now - t < 60_000).concat(now);
    if (losses.current.length > 3) {
      fail();
      return;
    }
    const retry = () => setGen((g) => g + 1);
    if (typeof document !== 'undefined' && document.hidden) {
      // se reconstruye cuando la persona vuelve a la app
      const onVis = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', onVis);
        setTimeout(retry, 200);
      };
      document.addEventListener('visibilitychange', onVis);
    } else {
      setTimeout(retry, 300);
    }
  }, [fail]);

  return { gen, failed, fail, lost };
}
