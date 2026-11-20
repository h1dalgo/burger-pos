'use client';

import type { Category, Order } from '@/types';
import { useCartStore } from '@/store/cart-store';

export interface ReorderResult {
  added: number;
  /** Productos que ya no están disponibles y no se pudieron agregar */
  skipped: string[];
}

/**
 * Vuelve a poner en el carrito los productos de un pedido anterior, con sus
 * mismas opciones (variación, extras, ingredientes quitados, selecciones y nota).
 */
export async function reorder(order: Order): Promise<ReorderResult> {
  const res = await fetch('/api/products', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar el menú');
  const categories: Category[] = await res.json();
  const byId = new Map(categories.flatMap((c) => c.products).map((p) => [p.id, p]));
  const byName = new Map(categories.flatMap((c) => c.products).map((p) => [p.name, p]));
  const { addItem } = useCartStore.getState();
  const result: ReorderResult = { added: 0, skipped: [] };

  for (const it of order.items) {
    const product = (it.productId && byId.get(it.productId)) || byName.get(it.productName);
    if (!product || !product.isAvailable) {
      result.skipped.push(it.productName);
      continue;
    }
    const variation = it.variation ? product.variations.find((v) => v.name === it.variation?.variationName && v.isAvailable) ?? null : null;
    if (it.variation && !variation) {
      result.skipped.push(it.productName);
      continue;
    }
    const addedExtras = it.addedExtras
      .map((e) => product.extraIngredients.find((x) => x.name === e.extraName && x.isAvailable))
      .filter((x): x is NonNullable<typeof x> => !!x);
    const selections: Record<string, string[]> = {};
    const selectionLabels: Record<string, string> = {};
    for (const s of it.selections) {
      const rs = product.requiredSelections.find((r) => r.label === s.selectionLabel);
      if (!rs || !rs.options.some((o) => o.name === s.selectedOptionName && o.isAvailable)) continue;
      (selections[rs.id] ??= []).push(s.selectedOptionName);
      selectionLabels[rs.id] = rs.label;
    }
    // si falta una selección obligatoria (opción agotada), se omite
    if (product.requiredSelections.some((r) => !selections[r.id]?.length)) {
      result.skipped.push(it.productName);
      continue;
    }
    addItem({
      product,
      variation,
      quantity: it.quantity,
      removedIngredients: it.removedIngredients.map((r) => r.ingredientName),
      addedExtras,
      selections,
      selectionLabels,
      note: it.note,
    });
    result.added += it.quantity;
  }
  return result;
}
