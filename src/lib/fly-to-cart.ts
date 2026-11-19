/**
 * Animación "volar al carrito": una imagen del producto sale del modal,
 * describe un arco y se encoge hasta el botón del carrito, que rebota al llegar.
 *
 * El botón destino se marca con el atributo `data-cart-target` y escucha el
 * evento `CART_BUMP_EVENT` en `window`.
 */

export const CART_BUMP_EVENT = 'cart:bump';

const bump = () => window.dispatchEvent(new Event(CART_BUMP_EVENT));

/** Punto medio de la curva de Bézier cuadrática. */
const quad = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

/**
 * @param src  Imagen del producto (PNG del 3D). Si es null solo rebota el carrito.
 * @param from Rectángulo de donde sale la imagen (el visor 3D).
 */
export function flyToCart(src: string | null, from: DOMRect | null | undefined) {
  if (typeof window === 'undefined') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!src || !from || reduced || typeof HTMLElement.prototype.animate !== 'function') {
    window.setTimeout(bump, 150);
    return;
  }

  // Destino: el botón del carrito; si aún no existe (primer producto), donde va a aparecer.
  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  const tr = target?.getBoundingClientRect();
  const tx = tr ? tr.left + tr.width / 2 : window.innerWidth / 2;
  const ty = tr ? tr.top + tr.height / 2 : window.innerHeight - 52;

  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  Object.assign(img.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    objectFit: 'contain',
    pointerEvents: 'none',
    zIndex: '9999',
    willChange: 'transform, opacity',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(img);

  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  // punto de control: arriba y un poco hacia el destino → arco natural
  const ctrlX = dx * 0.25;
  const ctrlY = Math.min(0, dy) - 120;
  const endScale = Math.min(0.2, 64 / Math.max(from.height, 1));

  const N = 14;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = quad(0, ctrlX, dx, t);
    const y = quad(0, ctrlY, dy, t);
    const s = 1 + (endScale - 1) * Math.pow(t, 0.85);
    const r = -14 * t;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`, opacity: t > 0.9 ? 1 - (t - 0.9) * 6 : 1 });
  }

  const anim = img.animate(frames, { duration: 760, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' });
  const done = () => {
    img.remove();
    bump();
  };
  anim.onfinish = done;
  anim.oncancel = done;
}
