import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { not: 'DELIVERED' },
      },
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, tableNumber, paymentMethod, items } = body;

    if (!customerName || !tableNumber || !paymentMethod || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let totalAmount = 0;
    const orderItems = items.map((item: any) => {
      let unitPrice = Number(item.basePrice);
      if (item.variation) unitPrice += Number(item.variation.additionalPrice);
      if (item.addedExtras) {
        for (const extra of item.addedExtras) {
          unitPrice += Number(extra.basePrice);
        }
      }
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        variation: item.variation
          ? { create: { variationName: item.variation.name, additionalPrice: item.variation.additionalPrice } }
          : undefined,
        removedIngredients: item.removedIngredients?.length
          ? { create: item.removedIngredients.map((name: string) => ({ ingredientName: name })) }
          : undefined,
        addedExtras: item.addedExtras?.length
          ? { create: item.addedExtras.map((extra: any) => ({ extraName: extra.name, price: extra.basePrice })) }
          : undefined,
        selections: item.selections
          ? {
              create: Object.entries(item.selections).flatMap(([, options]) =>
                (options as string[]).map((optionName: string) => ({
                  selectionLabel: item.selectionLabels?.[optionName] || 'Selección',
                  selectedOptionName: optionName,
                }))
              ),
            }
          : undefined,
      };
    });

    const order = await prisma.order.create({
      data: {
        customerName,
        tableNumber,
        paymentMethod,
        totalAmount,
        status: 'WAITING_PAYMENT',
        items: { create: orderItems },
      },
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
      global.io.to('kitchen').emit('order:new', order);
      global.io.to('clients').emit('order:created', { displayId: order.displayId });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
