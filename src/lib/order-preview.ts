/**
 * "Vista previa" del producto principal de un pedido, para mostrarlo en 3D en
 * la pantalla de seguimiento. El pedido guardado en el servidor no tiene los
 * ingredientes base de la hamburguesa, así que se guarda aquí al enviarlo
 * (solo en esta pestaña del navegador).
 */
import type { CartItem, Order } from '@/types';

export type PreviewVariant = 'burger' | 'drink' | 'starter' | 'dessert';

export interface OrderPreview {
  orderId: string;
  variant: PreviewVariant;
  name: string;
  description: string;
  /** Para hamburguesas: lista de ingredientes activos (como en el modal). */
  ingredients: string[];
  /** Opciones elegidas (sabor, salsas, variación). */
  choices: string[];
}

const KEY = 'burger-pos:order-preview';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Adivina el tipo de producto por su nombre (si no hay vista previa guardada). */
export function guessVariant(name: string): PreviewVariant {
  const n = norm(name);
  if (/refresco|jarra|jugo|nestea|bebida|vaso|soda|gaseosa|limonada|batido|cafe|agua/.test(n)) return 'drink';
  if (/paleta|helado|postre|brownie|torta|dulce/.test(n)) return 'dessert';
  if (/alita|papas|combo|tequen|nugget|entrada|snack/.test(n)) return 'starter';
  return 'burger';
}

export function savePreview(orderId: string, items: CartItem[], variantOf: (item: CartItem) => PreviewVariant) {
  if (!items.length) return;
  const main = items.find((i) => variantOf(i) === 'burger') ?? items[0];
  const choices = [...(main.variation ? [main.variation.name] : []), ...Object.values(main.selections).flat()];
  const preview: OrderPreview = {
    orderId,
    variant: variantOf(main),
    name: main.product.name,
    description: main.product.description,
    choices,
    ingredients: [
      ...choices,
      ...main.product.defaultIngredients.filter((d) => !main.removedIngredients.includes(d.name)).map((d) => d.name),
      ...main.addedExtras.map((e) => e.name),
    ],
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(preview));
  } catch {
    /* sin almacenamiento: se usa la vista previa aproximada */
  }
}

/** Vista previa guardada para este pedido o, si no hay, una aproximada desde el pedido del servidor. */
export function loadPreview(orderId: string, order: Order | null): OrderPreview | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as OrderPreview;
      if (p.orderId === orderId) return p;
    }
  } catch {
    /* ignorar */
  }
  if (!order?.items?.length) return null;
  const main = order.items.find((i) => guessVariant(i.productName) === 'burger') ?? order.items[0];
  const choices = [...(main.variation ? [main.variation.variationName] : []), ...main.selections.map((s) => s.selectedOptionName)];
  return {
    orderId,
    variant: guessVariant(main.productName),
    name: main.productName,
    description: '',
    choices,
    ingredients: [...choices, ...main.addedExtras.map((e) => e.extraName)],
  };
}
