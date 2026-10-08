import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface ReportItem {
  productName: string;
  quantity: number;
  revenue: number;
}

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

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { not: 'WAITING_PAYMENT' },
      },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    let revenue = 0;
    let tips = 0;
    const byMethod: Record<string, { count: number; total: number }> = {};
    const byWaiter: Record<string, { count: number; total: number }> = {};
    const productMap = new Map<string, ReportItem>();

    for (const order of orders) {
      const total = Number(order.totalAmount);
      const tip = Number(order.tip);
      revenue += total;
      tips += tip;

      const method = order.paymentMethod;
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count += 1;
      byMethod[method].total += total;

      const waiterKey = order.waiter || 'Sin mesero';
      if (!byWaiter[waiterKey]) byWaiter[waiterKey] = { count: 0, total: 0 };
      byWaiter[waiterKey].count += 1;
      byWaiter[waiterKey].total += total;

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
      revenue,
      tips,
      avgTicket: orders.length > 0 ? revenue / orders.length : 0,
      byMethod,
      byWaiter,
      topProducts,
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 });
  }
}
