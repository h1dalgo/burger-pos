import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { optionKey, optionStockLeft, stockLeftByProduct } from '@/lib/business';

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
    const optLeft = await optionStockLeft();
    const optOk = (kind: string, name: string) => (optLeft.get(`${kind}:${optionKey(name)}`) ?? Infinity) >= 1;

    // inventario: un insumo que no alcanza agota el producto; si alcanza, se informa cuántas quedan
    const result = categories.map((c) => ({
      ...c,
      products: c.products.map((p0) => {
        // extras y variaciones cuyo insumo no alcanza: agotados (el producto sin ellos se sigue vendiendo)
        const p = optLeft.size
          ? {
              ...p0,
              extraIngredients: p0.extraIngredients.map((e) => (e.isAvailable && !optOk('extra', e.name) ? { ...e, isAvailable: false } : e)),
              variations: p0.variations.map((v) => (v.isAvailable && !optOk('variation', v.name) ? { ...v, isAvailable: false } : v)),
            }
          : p0;
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
