import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@/lib/audit-labels';

/**
 * Registro de acciones: quién canceló, cobró, movió de mesa, cambió la tasa,
 * un precio o una promoción. Nunca rompe la acción principal si falla.
 *
 * Ojo: el "quién" lo declara la pantalla que hace la acción (mesero, cocina,
 * admin). Sin PIN por persona no es una prueba, pero deja el rastro de cada cosa.
 */
export async function audit(actor: string, action: AuditAction, detail: string, orderId?: string | null) {
  try {
    await prisma.auditLog.create({
      data: { actor: actor.slice(0, 40), action, detail: detail.slice(0, 300), orderId: orderId ?? null },
    });
  } catch (e) {
    console.error('audit failed', e);
  }
}

/** Nombre de quien hace la acción, tal como lo manda la pantalla. */
export function actorFrom(value: unknown, fallback = 'Sin identificar') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : fallback;
}

export const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;
export const orderTag = (o: { displayId: number; tableNumber: string }) => `#${String(o.displayId).padStart(4, '0')} · Mesa ${o.tableNumber}`;
export const METHOD_LABEL: Record<string, string> = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago Móvil', CARD: 'Tarjeta' };
