'use client';

import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Revela con GSAP los elementos marcados dentro del contenedor la primera vez
 * que entran en pantalla:
 * - [data-reveal]: suben 14 px y aparecen (en tandas, 40 ms entre cada uno).
 * - [data-reveal-line]: una línea que se dibuja de izquierda a derecha.
 * Con "reducir movimiento" todo queda visible sin animar.
 *
 * Ojo: antes se creaba un gsap.matchMedia() en cada cambio (buscar, filtrar…)
 * y quedaban anidados; al salir del menú, deshacerlos entraba en un bucle
 * infinito ("Maximum call stack size exceeded") y la página siguiente se caía.
 * Ahora todo vive en el mismo contexto de useGSAP, que lo limpia una sola vez.
 */
export function useScrollReveal(scope: RefObject<HTMLElement | null>, deps: unknown[]) {
  useGSAP(
    () => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // solo lo que todavía no apareció (lo ya revelado no se vuelve a animar)
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]:not([data-revealed]):not([data-reveal-armed])');
      const lines = gsap.utils.toArray<HTMLElement>('[data-reveal-line]:not([data-revealed]):not([data-reveal-armed])');
      if (!items.length && !lines.length) return;
      [...items, ...lines].forEach((el) => el.setAttribute('data-reveal-armed', ''));
      gsap.set(items, { autoAlpha: 0, y: 14 });
      gsap.set(lines, { scaleX: 0, transformOrigin: 'left center' });

      ScrollTrigger.batch(items, {
        start: 'top 94%',
        once: true,
        onEnter: (batch) => {
          batch.forEach((el) => el.setAttribute('data-revealed', ''));
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04, overwrite: true, clearProps: 'transform' });
        },
      });
      lines.forEach((line) =>
        gsap.to(line, {
          scaleX: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: line, start: 'top 94%', once: true },
          onStart: () => line.setAttribute('data-revealed', ''),
        })
      );
      ScrollTrigger.refresh();
    },
    { scope, dependencies: deps, revertOnUpdate: false }
  );
}
