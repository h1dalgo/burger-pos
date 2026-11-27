/**
 * Precarga en segundo plano las fotos del 3D de la pizza (≈430 KB) para que al
 * abrir una pizza ya estén en caché y no se vea el plato vacío esperando.
 * Los nombres deben coincidir con los de burger3d/PizzaSushi.js (loadPizzaPhoto).
 */
const PIZZA_DIR = '/food/pizza/';
const PIZZA_FILES = ['meta.json', 'pizza-margarita.webp', 'pizza-base.webp', 'pizza-blanca.webp', 'pizza-aux.webp', 'pizza-h-margarita.png', 'pizza-h-base.png'];

let started = false;

export function preloadPizzaPhotos() {
  if (started || typeof window === 'undefined') return;
  started = true;
  for (const f of PIZZA_FILES) {
    const url = PIZZA_DIR + f;
    if (f.endsWith('.json')) {
      void fetch(url, { priority: 'low' } as RequestInit).catch(() => {});
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // igual que el cargador del 3D: así reutiliza la misma copia
      img.decoding = 'async';
      img.src = url;
    }
  }
}
