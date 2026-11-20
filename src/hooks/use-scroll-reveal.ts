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
 */
export function useScrollReveal(scope: RefObject<HTMLElement | null>, deps: unknown[]) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray<HTMLElement>('[data-reveal]:not([data-revealed])');
        const lines = gsap.utils.toArray<HTMLElement>('[data-reveal-line]:not([data-revealed])');
        if (!items.length && !lines.length) return;
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
      });
      return () => mm.revert();
    },
    { scope, dependencies: deps, revertOnUpdate: false }
  );
}
