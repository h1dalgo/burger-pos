import { useEffect, type RefObject } from 'react';

/**
 * Cierra una hoja/ventana con Escape, solo si es la que está encima de todas
 * (la última ventana modal abierta en la página).
 */
export function useEscapeClose(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelectorAll('[aria-modal="true"]');
      if (open[open.length - 1] !== ref.current) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref, onClose]);
}
