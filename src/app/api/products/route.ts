import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { outOfStockProductIds } from '@/lib/business';

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
      outOfStockProductIds(),
    ]);

    // un insumo agotado (inventario) agota los productos que lo usan
    const result = outOfStock.size
      ? categories.map((c) => ({
          ...c,
          products: c.products.map((p) => (outOfStock.has(p.id) ? { ...p, isAvailable: false, outOfStock: true } : p)),
        }))
      : categories;

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
