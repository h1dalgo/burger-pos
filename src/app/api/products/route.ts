import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        products: {
          orderBy: { createdAt: 'asc' },
          include: {
            variations: true,
            defaultIngredients: true,
            extraIngredients: true,
            requiredSelections: {
              include: { options: true },
            },
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
