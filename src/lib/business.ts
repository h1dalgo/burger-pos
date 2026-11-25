/**
 * Reglas del negocio que se usan en el servidor: horario, promociones e
 * inventario. Todo en la hora local del negocio (ajustes.timezone).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type Tx = PrismaClient | Prisma.TransactionClient;

export async function getSettings(db: Tx = prisma) {
  const found = await db.businessSettings.findFirst();
  return found ?? (await db.businessSettings.create({ data: { name: 'Burger POS', logoUrl: null } }));
}

/** Día (0=domingo), hora y minutos actuales en la zona horaria del negocio. */
export function localNow(timezone: string, at: Date = new Date()) {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'America/Caracas';
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { day: days.indexOf(get('weekday')), hour: Number(get('hour')), minute: Number(get('minute')) };
}

const toMinutes = (hhmm?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export interface OpenState {
  open: boolean;
  /** Texto para el cliente: "Abrimos a las 11:00" */
  message: string | null;
}

/** ¿Se pueden recibir pedidos ahora? (interruptor manual + horario) */
export function openState(s: { isOpen: boolean; openTime: string | null; closeTime: string | null; timezone: string }, at = new Date()): OpenState {
  if (!s.isOpen) return { open: false, message: 'Estamos cerrados por ahora' };
  const from = toMinutes(s.openTime);
  const to = toMinutes(s.closeTime);
  if (from === null || to === null || from === to) return { open: true, message: null };
  const { hour, minute } = localNow(s.timezone, at);
  const now = hour * 60 + minute;
  // horario que cruza la medianoche (ej. 18:00 a 02:00)
  const inside = from < to ? now >= from && now < to : now >= from || now < to;
  return inside ? { open: true, message: null } : { open: false, message: `Abrimos a las ${s.openTime}` };
}

/* ───────────────────────── Promociones ───────────────────────── */

export interface PricedLine {
  categoryId: string;
  subtotal: number;
}

type PromoRow = Awaited<ReturnType<typeof prisma.promotion.findMany>>[number];

export function promoAppliesNow(p: PromoRow, timezone: string, at = new Date()) {
  if (!p.active) return false;
  const { day, hour } = localNow(timezone, at);
  if (p.days.length && !p.days.includes(day)) return false;
  if (p.startHour !== null && p.endHour !== null && p.startHour !== p.endHour) {
    const inside = p.startHour < p.endHour ? hour >= p.startHour && hour < p.endHour : hour >= p.startHour || hour < p.endHour;
    if (!inside) return false;
  }
  return true;
}

function promoDiscount(p: PromoRow, lines: PricedLine[]) {
  const base = p.categoryId ? lines.filter((l) => l.categoryId === p.categoryId).reduce((s, l) => s + l.subtotal, 0) : lines.reduce((s, l) => s + l.subtotal, 0);
  const total = lines.reduce((s, l) => s + l.subtotal, 0);
  if (base <= 0 || total < Number(p.minTotal)) return 0;
  const raw = p.type === 'PERCENT' ? (base * Math.min(Number(p.value), 100)) / 100 : Math.min(Number(p.value), base);
  return Math.round(raw * 100) / 100;
}

export interface DiscountResult {
  discount: number;
  label: string | null;
  /** El cupón escrito no existe o no aplica ahora */
  couponError?: string;
}

/**
 * La mejor promoción automática vigente; si el cliente escribe un cupón válido
 * y da más descuento, se usa el cupón. Nunca se suman dos promociones.
 */
export async function bestDiscount(lines: PricedLine[], couponCode: string | null | undefined, timezone: string, db: Tx = prisma): Promise<DiscountResult> {
  const promos = await db.promotion.findMany({ where: { active: true } });
  let best: DiscountResult = { discount: 0, label: null };
  for (const p of promos) {
    if (p.code || !promoAppliesNow(p, timezone)) continue;
    const d = promoDiscount(p, lines);
    if (d > best.discount) best = { discount: d, label: p.name };
  }
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const c = promos.find((p) => p.code?.toUpperCase() === code);
    if (!c || !promoAppliesNow(c, timezone)) return { ...best, couponError: 'Ese cupón no existe o no está vigente' };
    const d = promoDiscount(c, lines);
    if (d <= 0) return { ...best, couponError: 'El cupón no aplica a este pedido' };
    if (d >= best.discount) best = { discount: d, label: `Cupón ${c.code}` };
  }
  return best;
}

/** Promociones automáticas vigentes (para mostrarlas en el menú). */
export async function currentPromotions(timezone: string, db: Tx = prisma) {
  const promos = await db.promotion.findMany({ where: { active: true, code: null } });
  return promos.filter((p) => promoAppliesNow(p, timezone));
}

/* ───────────────────────── Inventario ───────────────────────── */

/** Productos que usan un insumo agotado (existencia ≤ 0). */
/**
 * Cuántas unidades se pueden vender de cada producto que usa inventario
 * (el insumo que primero se acaba manda). Productos sin inventario no aparecen.
 */
export async function stockLeftByProduct(db: Tx = prisma) {
  const usages = await db.inventoryUsage.findMany({ select: { productId: true, amount: true, inventoryItem: { select: { quantity: true } } } });
  const left = new Map<string, number>();
  for (const u of usages) {
    const amount = Number(u.amount);
    if (amount <= 0) continue;
    const units = Math.max(0, Math.floor((Number(u.inventoryItem.quantity) + 1e-9) / amount));
    left.set(u.productId, Math.min(left.get(u.productId) ?? Infinity, units));
  }
  return left;
}

/** Productos agotados: su insumo no alcanza ni para una unidad (no solo cuando llega a 0). */
export async function outOfStockProductIds(db: Tx = prisma) {
  const left = await stockLeftByProduct(db);
  return new Set([...left].filter(([, n]) => n < 1).map(([id]) => id));
}

/** El pedido pide más de lo que hay de un insumo: se rechaza entero (no queda stock negativo). */
export class StockError extends Error {
  constructor(public itemId: string, public itemName: string, public available: number) {
    super(`No alcanza el stock de ${itemName}`);
  }
}

/** Descuenta (sign=-1) o devuelve (sign=1) los insumos que usan estos productos. */
export async function moveInventory(lines: { productId: string; quantity: number }[], sign: 1 | -1, db: Tx = prisma) {
  if (!lines.length) return;
  const qtyByProduct = new Map<string, number>();
  for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
  const usages = await db.inventoryUsage.findMany({ where: { productId: { in: [...qtyByProduct.keys()] } } });
  const byItem = new Map<string, number>();
  for (const u of usages) byItem.set(u.inventoryItemId, (byItem.get(u.inventoryItemId) ?? 0) + Number(u.amount) * (qtyByProduct.get(u.productId) ?? 0));
  for (const [id, amount] of byItem) {
    if (sign === 1) {
      await db.inventoryItem.update({ where: { id }, data: { quantity: { increment: amount } } });
      continue;
    }
    // descuento atómico: solo si alcanza. Dos pedidos al mismo tiempo no pueden
    // llevarse la última unidad: el segundo no encuentra stock suficiente.
    const r = await db.inventoryItem.updateMany({ where: { id, quantity: { gte: amount } }, data: { quantity: { decrement: amount } } });
    if (r.count === 0) {
      const item = await db.inventoryItem.findUnique({ where: { id }, select: { name: true, quantity: true } });
      throw new StockError(id, item?.name ?? 'un insumo', Number(item?.quantity ?? 0));
    }
  }
}
