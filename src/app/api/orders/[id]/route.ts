import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { moveInventory } from '@/lib/business';
import { sendPush } from '@/lib/push';
import type { OrderStatus } from '@/types';

export const runtime = 'nodejs';

const ORDER_INCLUDE = {
  items: {
    include: {
      variation: true,
      removedIngredients: true,
      addedExtras: true,
      selections: true,
    },
  },
} satisfies Prisma.OrderInclude;

const VALID: OrderStatus[] = ['WAITING_PAYMENT', 'PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED', 'CANCELLED'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, tableNumber, cancelReason } = body;

    if (status === undefined && tableNumber === undefined) {
      return NextResponse.json({ error: 'Status or tableNumber is required' }, { status: 400 });
    }

    const prev = await prisma.order.findUnique({ where: { id }, select: { status: true, items: { select: { productId: true, quantity: true } } } });
    if (!prev) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const data: Prisma.OrderUpdateInput = {};

    if (status !== undefined) {
      if (!VALID.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (prev.status === 'CANCELLED' && status !== 'CANCELLED') {
        return NextResponse.json({ error: 'El pedido está cancelado' }, { status: 409 });
      }
      data.status = status as OrderStatus;
      if (status === 'CANCELLED') {
        data.cancelReason = typeof cancelReason === 'string' && cancelReason.trim() ? cancelReason.trim().slice(0, 200) : 'Cancelado';
      }
    }

    if (tableNumber !== undefined) {
      if (typeof tableNumber !== 'string' || !tableNumber.trim() || tableNumber.trim().length > 10) {
        return NextResponse.json({ error: 'Invalid tableNumber' }, { status: 400 });
      }
      data.tableNumber = tableNumber.trim();
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id }, data, include: ORDER_INCLUDE });
      // al cancelar se devuelven los insumos al inventario
      if (status === 'CANCELLED' && prev.status !== 'CANCELLED') await moveInventory(prev.items, 1, tx);
      return updated;
    });

    if (global.io) {
      if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
        global.io.to('kitchen').emit('order:archived', id);
      } else {
        global.io.to('kitchen').emit('order:updated', order);
      }
      global.io.to('waiter').emit('order:updated', order);
      global.io.to('clients').emit('order:updated', order);
      if (data.status === 'CANCELLED') global.io.emit('stock:refresh');
    }

    if (data.status === 'READY' && prev.status !== 'READY') {
      const num = String(order.displayId).padStart(4, '0');
      void sendPush({ orderId: id }, { title: '¡Tu pedido está listo!', body: `Pedido #${num}. Muéstralo en el mostrador.`, url: `/success?orderId=${order.displayId}`, tag: `ready-${id}` });
      void sendPush({ role: 'waiter' }, { title: `Pedido #${num} listo`, body: `Mesa ${order.tableNumber} · para servir`, url: '/meseros', tag: `ready-${id}` });
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
