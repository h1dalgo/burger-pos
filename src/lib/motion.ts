/**
 * Lenguaje de movimiento de la app (principios de Emil Kowalski):
 * - Entradas y salidas con ease-out fuerte: responden al instante y frenan suave.
 * - Duraciones cortas en la interfaz (≤ 300 ms); solo lo decorativo puede durar más.
 * - Nada aparece desde escala 0: se entra desde 0.95–0.98 + opacidad.
 * - Hojas y cajones con la curva de iOS; resortes sin rebote para gestos.
 * - Solo se animan transform y opacity (y un leve blur al intercambiar contenido).
 */

/** Ease-out fuerte para entradas, hover y cambios de estado. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Curva de hojas / cajones (la del sistema en iOS). */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const CSS_EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** Resorte sin rebote para hojas que se pueden arrastrar (interrumpible). */
export const SHEET_SPRING = { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 } as const;

/** Intercambio de contenido: entra desde un leve desenfoque (se nota menos el corte). */
export const SWAP = {
  initial: { opacity: 0, y: 6, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -4, filter: 'blur(4px)' },
  transition: { duration: 0.24, ease: EASE_OUT },
};
