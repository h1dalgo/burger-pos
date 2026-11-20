import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bestDiscount, getSettings } from '@/lib/business';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Calcula el descuento que tendría el carrito (promoción vigente o cupón),
 * para mostrarlo antes de enviar. El pedido lo vuelve a calcular el servidor.
 */
export async function POST(request: NextRequest) {
  try {
    const { items, code } = await request.json();
    if (!Array.isArray(items) || items.length > 100) return NextResponse.json({ discount: 0, label: null });
    const ids = [...new Set(items.map((i: { productId?: string }) => i?.productId).filter((x: unknown) => typeof x === 'string' && UUID_RE.test(x as string)))] as string[];
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, categoryId: true } });
    const cat = new Map(products.map((p) => [p.id, p.categoryId]));
    const lines = items
      .filter((i: { productId?: string }) => cat.has(i.productId as string))
      .map((i: { productId: string; subtotal: unknown }) => ({ categoryId: cat.get(i.productId)!, subtotal: Math.max(0, Number(i.subtotal) || 0) }));
    const s = await getSettings();
    const result = await bestDiscount(lines, typeof code === 'string' ? code.slice(0, 30) : null, s.timezone);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ discount: 0, label: null });
  }
}
