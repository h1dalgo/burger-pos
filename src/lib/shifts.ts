import { prisma } from '@/lib/prisma';

export interface ShiftTotals {
  count: number;
  /** Lo cobrado por método (total + propina), en dólares. */
  byMethod: Record<'CASH' | 'MOBILE_PAYMENT' | 'CARD', number>;
}

/**
 * Lo que cobró una persona entre dos momentos (pedidos que confirmó como pagados
 * y no se cancelaron después). El cliente paga total + propina.
 */
export async function shiftTotals(person: string, from: Date, to: Date): Promise<ShiftTotals> {
  const orders = await prisma.order.findMany({
    where: { paidBy: person, paidAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
    select: { paymentMethod: true, totalAmount: true, tip: true },
  });
  const byMethod = { CASH: 0, MOBILE_PAYMENT: 0, CARD: 0 };
  for (const o of orders) byMethod[o.paymentMethod] += Number(o.totalAmount) + Number(o.tip);
  for (const k of Object.keys(byMethod) as (keyof typeof byMethod)[]) byMethod[k] = Math.round(byMethod[k] * 100) / 100;
  return { count: orders.length, byMethod };
}

/** Efectivo que debería haber al cerrar: lo inicial + lo cobrado en efectivo. */
export const expectedCash = (opening: number, totals: ShiftTotals) => Math.round((opening + totals.byMethod.CASH) * 100) / 100;

export type ShiftRow = Awaited<ReturnType<typeof prisma.cashShift.findFirst>>;

/** Cierra un turno: guarda lo contado y lo esperado (la diferencia se calcula al mostrar). */
export async function closeShift(id: string, counted: number, closedBy: string, note: string | null) {
  const shift = await prisma.cashShift.findUnique({ where: { id } });
  if (!shift || shift.closedAt) return null;
  const closedAt = new Date();
  const totals = await shiftTotals(shift.person, shift.openedAt, closedAt);
  const expected = expectedCash(Number(shift.openingCash), totals);
  const updated = await prisma.cashShift.update({
    where: { id },
    data: { closedAt, closedBy, countedCash: counted, expectedCash: expected, note },
  });
  return { shift: updated, totals, expected, difference: Math.round((counted - expected) * 100) / 100 };
}

/** Monto válido en dólares (0 a 100.000, dos decimales). */
export function parseAmount(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return null;
  return Math.round(n * 100) / 100;
}
