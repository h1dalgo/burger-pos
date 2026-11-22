import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings, localNow } from '@/lib/business';

export const runtime = 'nodejs';

interface ReportItem {
  productName: string;
  quantity: number;
  revenue: number;
}

const METHOD: Record<string, string> = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago Móvil', CARD: 'Tarjeta' };
const STATUS: Record<string, string> = {
  WAITING_PAYMENT: 'Esperando pago',
  PENDING: 'En cola',
  IN_PREPARATION: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const startParam = params.get('start');
    const endParam = params.get('end');

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultEnd = new Date(defaultStart.getTime() + 24 * 60 * 60 * 1000);

    const start = startParam ? new Date(startParam) : defaultStart;
    const end = endParam ? new Date(endParam) : defaultEnd;

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const settings = await getSettings();
    const all = await prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    // Exportar a Excel (CSV con ; y BOM para que Excel respete los acentos)
    if (params.get('format') === 'csv') {
      const head = ['Pedido', 'Recibo', 'Fecha', 'Hora', 'Estado', 'Cliente', 'Mesa', 'Mesero', 'Cobró', 'Pago', 'Referencia', 'Cédula/RIF', 'Productos', 'Descuento $', 'Total $', 'Propina $', 'Tasa Bs/$', 'Total Bs', 'Calificación', 'Motivo de cancelación'];
      const fmtDate = new Intl.DateTimeFormat('es-VE', { timeZone: settings.timezone, day: '2-digit', month: '2-digit', year: 'numeric' });
      const fmtTime = new Intl.DateTimeFormat('es-VE', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      const rows = all.map((o) => {
        const rate = Number(o.exchangeRate ?? 0);
        return [
          String(o.displayId).padStart(4, '0'),
          o.receiptNumber ? String(o.receiptNumber).padStart(6, '0') : '',
          fmtDate.format(o.createdAt),
          fmtTime.format(o.createdAt),
          STATUS[o.status] ?? o.status,
          o.customerName,
          o.tableNumber,
          o.waiter ?? '',
          o.paidBy ?? '',
          METHOD[o.paymentMethod] ?? o.paymentMethod,
          o.paymentReference ?? '',
          o.customerDoc ?? '',
          o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
          Number(o.discount).toFixed(2).replace('.', ','),
          Number(o.totalAmount).toFixed(2).replace('.', ','),
          Number(o.tip).toFixed(2).replace('.', ','),
          rate ? rate.toFixed(2).replace('.', ',') : '',
          rate ? (Number(o.totalAmount) * rate).toFixed(2).replace('.', ',') : '',
          o.rating ?? '',
          o.cancelReason ?? '',
        ];
      });
      const csv = '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
      const day = startParam ? startParam.slice(0, 10) : defaultStart.toISOString().slice(0, 10);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="corte-${day}.csv"`,
        },
      });
    }

    // Solo cuentan los pedidos pagados (ni por confirmar ni cancelados)
    const orders = all.filter((o) => o.status !== 'WAITING_PAYMENT' && o.status !== 'CANCELLED');

    let revenue = 0;
    let revenueBs = 0;
    let tips = 0;
    let discounts = 0;
    const byMethod: Record<string, { count: number; total: number }> = {};
    const byWaiter: Record<string, { count: number; total: number; cash: number }> = {};
    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, total: 0 }));
    const byWeekday = Array.from({ length: 7 }, (_, d) => ({ day: d, count: 0, total: 0 }));
    const productMap = new Map<string, ReportItem>();
    let ratingSum = 0;
    let ratingCount = 0;

    for (const order of orders) {
      const total = Number(order.totalAmount);
      const tip = Number(order.tip);
      revenue += total;
      tips += tip;
      discounts += Number(order.discount);
      revenueBs += total * Number(order.exchangeRate ?? settings.exchangeRate);
      if (order.rating) {
        ratingSum += order.rating;
        ratingCount += 1;
      }

      const method = order.paymentMethod;
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count += 1;
      byMethod[method].total += total;

      // por quien cobró (mesero o admin): sirve para cuadrar la caja de cada uno
      const waiterKey = order.paidBy || order.waiter || 'Sin registrar';
      if (!byWaiter[waiterKey]) byWaiter[waiterKey] = { count: 0, total: 0, cash: 0 };
      byWaiter[waiterKey].count += 1;
      byWaiter[waiterKey].total += total;
      if (method === 'CASH') byWaiter[waiterKey].cash += total;

      const { hour, day } = localNow(settings.timezone, order.createdAt);
      byHour[hour].count += 1;
      byHour[hour].total += total;
      byWeekday[day].count += 1;
      byWeekday[day].total += total;

      for (const item of order.items) {
        const entry = productMap.get(item.productName) || {
          productName: item.productName,
          quantity: 0,
          revenue: 0,
        };
        entry.quantity += item.quantity;
        entry.revenue += Number(item.subtotal);
        productMap.set(item.productName, entry);
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      start: start.toISOString(),
      end: end.toISOString(),
      count: orders.length,
      cancelled: all.filter((o) => o.status === 'CANCELLED').length,
      revenue,
      revenueBs,
      exchangeRate: Number(settings.exchangeRate),
      tips,
      discounts,
      avgTicket: orders.length > 0 ? revenue / orders.length : 0,
      avgRating: ratingCount ? ratingSum / ratingCount : null,
      ratingCount,
      byMethod,
      byWaiter,
      byHour,
      byWeekday,
      topProducts,
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 });
  }
}
