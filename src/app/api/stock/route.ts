import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, isAvailable } = body;

    if (!type || !id || isAvailable === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'product':
        result = await prisma.product.update({
          where: { id },
          data: { isAvailable },
          include: {
            variations: { select: { id: true } },
            category: { select: { name: true } },
          },
        });
        break;
      case 'variation':
        result = await prisma.productVariation.update({
          where: { id },
          data: { isAvailable },
          include: { product: { select: { id: true, name: true } } },
        });
        break;
      case 'option':
        result = await prisma.requiredSelectionOption.update({
          where: { id },
          data: { isAvailable },
        });
        break;
      case 'extra':
        result = await prisma.extraIngredient.update({
          where: { id },
          data: { isAvailable },
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (global.io) {
      global.io.emit('stock:updated', { type, id, isAvailable, ...result });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Stock update error:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}
