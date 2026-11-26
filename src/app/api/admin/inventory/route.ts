import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseInventory } from './parse';

export const runtime = 'nodejs';

const shape = (i: Awaited<ReturnType<typeof list>>[number]) => ({
  ...i,
  quantity: Number(i.quantity),
  lowAt: Number(i.lowAt),
  usages: i.usages.map((u) => ({ productId: u.productId, productName: u.product.name, amount: Number(u.amount) })),
  optionUsages: i.optionUsages.map((o) => ({ kind: o.kind, name: o.name, label: o.label, amount: Number(o.amount) })),
});
const list = () =>
  prisma.inventoryItem.findMany({
    orderBy: { name: 'asc' },
    include: { usages: { include: { product: { select: { name: true } } } }, optionUsages: true },
  });

export async function GET() {
  return NextResponse.json((await list()).map(shape));
}

export async function POST(request: NextRequest) {
  try {
    const parsed = parseInventory(await request.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { usages, optionUsages, ...data } = parsed.data;
    const item = await prisma.inventoryItem.create({
      data: {
        ...data,
        usages: { create: usages.map((u) => ({ productId: u.productId, amount: u.amount })) },
        optionUsages: { create: optionUsages },
      },
    });
    global.io?.emit('stock:refresh');
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Ya existe un insumo con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: 'No se pudo crear el insumo' }, { status: 500 });
  }
}
