/**
 * Recibo digital del cliente (servidor).
 * - Cada pedido pagado recibe un número correlativo (contador atómico en ajustes).
 * - El recibo se ve en /recibo/<id del pedido> (enlace privado, no adivinable).
 * - Si el cliente dejó su correo y hay RESEND_API_KEY, se le envía por correo.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/business';
import { sendPush } from '@/lib/push';

type Tx = PrismaClient | Prisma.TransactionClient;

/** Estados en los que el pedido ya está pagado. */
export const PAID_STATUSES = ['PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED'] as const;

export const formatReceiptNumber = (n: number) => String(n).padStart(6, '0');

/** Asigna número de recibo si el pedido ya está pagado y aún no tiene. Devuelve el número nuevo (o null). */
export async function assignReceipt(orderId: string, db: Tx = prisma): Promise<number | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, receiptNumber: true } });
  if (!order || order.receiptNumber || !(PAID_STATUSES as readonly string[]).includes(order.status)) return null;
  const s = await getSettings(db);
  // el incremento es atómico: dos pagos a la vez nunca reciben el mismo número
  const bumped = await db.businessSettings.update({ where: { id: s.id }, data: { nextReceipt: { increment: 1 } }, select: { nextReceipt: true } });
  const number = bumped.nextReceipt - 1;
  await db.order.update({ where: { id: orderId }, data: { receiptNumber: number, paidAt: new Date() } });
  return number;
}

/** Quita datos personales del cliente de lo que se envía a cocina, meseros o al seguimiento público. */
export function redactOrder<T extends { customerEmail?: string | null; customerDoc?: string | null }>(order: T) {
  const { customerEmail: _e, customerDoc: _d, ...rest } = order;
  void _e;
  void _d;
  return rest;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function emailEnabled() {
  return !!process.env.RESEND_API_KEY;
}

/** Envía el recibo por correo (si hay correo del cliente y servicio configurado). */
export async function sendReceiptEmail(orderId: string, baseUrl: string): Promise<{ ok: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'El envío por correo no está configurado' };
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { variation: true, addedExtras: true } } } });
  if (!order?.customerEmail) return { ok: false, reason: 'El cliente no dejó correo' };
  if (!order.receiptNumber) return { ok: false, reason: 'El pedido aún no está pagado' };
  const s = await getSettings();
  const business = s.legalName || s.name;
  const link = `${baseUrl.replace(/\/$/, '')}/recibo/${order.id}`;
  const money = (n: unknown) => `$${Number(n).toFixed(2)}`;
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#3a332a">${i.quantity}× ${esc(i.productName)}${i.variation ? ` (${esc(i.variation.variationName)})` : ''}${
          i.addedExtras.length ? `<br><span style="color:#8a7d6b;font-size:12px">+ ${i.addedExtras.map((e) => esc(e.extraName)).join(', ')}</span>` : ''
        }</td><td style="padding:6px 0;text-align:right;color:#3a332a">${money(i.subtotal)}</td></tr>`
    )
    .join('');
  const total = Number(order.totalAmount) + Number(order.tip);
  const html = `<!doctype html><html><body style="margin:0;background:#f5f0e8;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:24px">
<div style="background:#fffdf8;border:1px solid #e6dccb;border-radius:16px;padding:28px">
<p style="margin:0;color:#a07a3c;font-size:11px;letter-spacing:3px;text-transform:uppercase">Recibo digital</p>
<h1 style="margin:6px 0 2px;font-family:Georgia,serif;font-weight:500;color:#17110a;font-size:26px">${esc(business)}</h1>
${s.rif ? `<p style="margin:0;color:#8a7d6b;font-size:13px">RIF ${esc(s.rif)}</p>` : ''}
<p style="margin:18px 0 4px;color:#17110a;font-size:15px">Hola ${esc(order.customerName)}, gracias por tu pedido.</p>
<p style="margin:0 0 18px;color:#8a7d6b;font-size:13px">Recibo N.º ${formatReceiptNumber(order.receiptNumber)} · Pedido #${String(order.displayId).padStart(4, '0')}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
<hr style="border:none;border-top:1px solid #e6dccb;margin:14px 0">
<table style="width:100%;font-size:14px;color:#3a332a">
${Number(order.discount) > 0 ? `<tr><td>${esc(order.promoLabel || 'Descuento')}</td><td style="text-align:right">−${money(order.discount)}</td></tr>` : ''}
${Number(order.tip) > 0 ? `<tr><td>Propina</td><td style="text-align:right">${money(order.tip)}</td></tr>` : ''}
<tr><td style="padding-top:6px;font-weight:bold;color:#17110a">Total</td><td style="padding-top:6px;text-align:right;font-weight:bold;color:#17110a">${money(total)}</td></tr>
${order.exchangeRate ? `<tr><td style="color:#8a7d6b;font-size:12px">Tasa ${Number(order.exchangeRate).toLocaleString('es-VE')} Bs/$</td><td style="text-align:right;color:#8a7d6b;font-size:12px">Bs ${(total * Number(order.exchangeRate)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>` : ''}
</table>
<p style="margin:24px 0 0;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#d8ad66;color:#17110a;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Ver recibo completo</a></p>
<p style="margin:18px 0 0;text-align:center;color:#a39682;font-size:11px">Documento no fiscal${s.receiptFooter ? ` · ${esc(s.receiptFooter)}` : ''}</p>
</div></div></body></html>`;

  const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RECEIPT_FROM || `${business} <onboarding@resend.dev>`,
      to: [order.customerEmail],
      subject: `Tu recibo de ${business} · N.º ${formatReceiptNumber(order.receiptNumber)}`,
      html,
    }),
  }).catch(() => null);
  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => '') : 'sin conexión';
    console.error('Resend error:', detail);
    return { ok: false, reason: 'El servicio de correo rechazó el envío' };
  }
  await prisma.order.update({ where: { id: orderId }, data: { receiptSentAt: new Date() } });
  return { ok: true };
}

/** Tras confirmarse el pago: número de recibo, aviso al cliente y correo. */
export async function onPaid(orderId: string, baseUrl: string) {
  const number = await assignReceipt(orderId);
  if (!number) return null;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { displayId: true } });
  void sendPush({ orderId }, {
    title: 'Pago confirmado',
    body: `Tu recibo digital N.º ${formatReceiptNumber(number)} está listo.`,
    url: `/recibo/${orderId}`,
    tag: `paid-${orderId}`,
  });
  void sendReceiptEmail(orderId, baseUrl).catch((e) => console.error('sendReceiptEmail', e));
  global.io?.to('clients').emit('receipt:ready', { orderId, displayId: order?.displayId, receiptNumber: number });
  return number;
}

/** URL pública del sitio (para los enlaces del correo). */
export function baseUrlFrom(request: Request) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  const h = request.headers;
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}
