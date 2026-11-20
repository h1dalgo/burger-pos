import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const STATUSES = ['WAITING_PAYMENT', 'PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED', 'CANCELLED'] as const;
const PAGE = 30;

/**
 * Historial de pedidos con búsqueda: ?q= (número, nombre, mesa o referencia),
 * &status=, &start=&end= (ISO) y &page= (desde 1).
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim().slice(0, 60);
    const status = sp.get('status');
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const start = sp.get('start') ? new Date(sp.get('start')!) : null;
    const end = sp.get('end') ? new Date(sp.get('end')!) : null;

    const where: Prisma.OrderWhereInput = {};
    if (status && (STATUSES as readonly string[]).includes(status)) where.status = status as (typeof STATUSES)[number];
    if ((start && !Number.isNaN(start.getTime())) || (end && !Number.isNaN(end.getTime()))) {
      where.createdAt = {
        ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
        ...(end && !Number.isNaN(end.getTime()) ? { lt: end } : {}),
      };
    }
    if (q) {
      const num = Number(q.replace(/^#/, ''));
      where.OR = [
        ...(Number.isInteger(num) && num > 0 ? [{ displayId: num }] : []),
        { customerName: { contains: q, mode: 'insensitive' } },
        { tableNumber: { equals: q } },
        { paymentReference: { contains: q.replace(/\D/g, '') || '\u0000' } },
        { waiter: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE,
        take: PAGE,
        include: { items: { include: { variation: true, removedIngredients: true, addedExtras: true, selections: true } } },
      }),
    ]);
    return NextResponse.json({ total, page, pages: Math.max(1, Math.ceil(total / PAGE)), orders });
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'No se pudo cargar el historial' }, { status: 500 });
  }
}
