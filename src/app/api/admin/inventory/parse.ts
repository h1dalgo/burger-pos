const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InventoryInput {
  name: string;
  quantity: number;
  unit: string;
  lowAt: number;
  usages: { productId: string; amount: number }[];
}

/** Valida un insumo del formulario del admin. */
export function parseInventory(b: Record<string, unknown>): { data: InventoryInput } | { error: string } {
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : '';
  if (!name) return { error: 'Escribe el nombre del insumo' };
  const quantity = Number(b.quantity);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000) return { error: 'Cantidad inválida' };
  const lowAt = Number(b.lowAt ?? 5);
  if (!Number.isFinite(lowAt) || lowAt < 0) return { error: 'Alerta inválida' };
  const unit = typeof b.unit === 'string' && b.unit.trim() ? b.unit.trim().slice(0, 12) : 'u';
  const raw = Array.isArray(b.usages) ? b.usages : [];
  const usages: { productId: string; amount: number }[] = [];
  for (const u of raw as { productId?: unknown; amount?: unknown }[]) {
    if (typeof u?.productId !== 'string' || !UUID_RE.test(u.productId)) continue;
    const amount = Number(u.amount ?? 1);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) return { error: 'Cantidad por producto inválida' };
    if (!usages.some((x) => x.productId === u.productId)) usages.push({ productId: u.productId, amount });
  }
  return { data: { name, quantity, unit, lowAt, usages } };
}
