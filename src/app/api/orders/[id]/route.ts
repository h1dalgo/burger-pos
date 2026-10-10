import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@/types';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, tableNumber } = body;

    if (status === undefined && tableNumber === undefined) {
      return NextResponse.json({ error: 'Status or tableNumber is required' }, { status: 400 });
    }

    const data: { status?: OrderStatus; tableNumber?: string } = {};

    if (status !== undefined) {
      const validStatuses: string[] = ['WAITING_PAYMENT', 'PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = status as OrderStatus;
    }

    if (tableNumber !== undefined) {
      if (typeof tableNumber !== 'string' || !tableNumber.trim() || tableNumber.trim().length > 10) {
        return NextResponse.json({ error: 'Invalid tableNumber' }, { status: 400 });
      }
      data.tableNumber = tableNumber.trim();
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            variation: true,
            removedIngredients: true,
            addedExtras: true,
            selections: true,
          },
        },
      },
    });

    if (global.io) {
      if (data.status === 'DELIVERED') {
        global.io.to('kitchen').emit('order:archived', id);
      } else {
        global.io.to('kitchen').emit('order:updated', order);
      }
      global.io.to('waiter').emit('order:updated', order);
      global.io.to('clients').emit('order:updated', order);
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variation: true,
            removedIngredients: true,
            addedExtras: true,
            selections: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
