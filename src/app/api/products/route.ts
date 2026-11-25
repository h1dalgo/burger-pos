import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stockLeftByProduct } from '@/lib/business';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [categories, outOfStock] = await Promise.all([
      prisma.category.findMany({
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
      }),
      stockLeftByProduct(),
    ]);

    // inventario: un insumo que no alcanza agota el producto; si alcanza, se informa cuántas quedan
    const result = categories.map((c) => ({
      ...c,
      products: c.products.map((p) => {
        if (!outOfStock.has(p.id)) return p;
        const left = outOfStock.get(p.id)!;
        return left < 1 ? { ...p, isAvailable: false, outOfStock: true, stockLeft: 0 } : { ...p, stockLeft: left };
      }),
    }));

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
