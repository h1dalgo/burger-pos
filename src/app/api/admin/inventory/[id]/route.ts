import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseInventory } from '../parse';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    // ajuste rápido de existencia: { add: 10 } o { quantity: 25 }
    if (Object.keys(body).every((k) => k === 'add' || k === 'quantity') && (body.add !== undefined || body.quantity !== undefined)) {
      const add = Number(body.add);
      const set = Number(body.quantity);
      if (body.add !== undefined && !Number.isFinite(add)) return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      if (body.quantity !== undefined && (!Number.isFinite(set) || set < 0)) return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      const item = await prisma.inventoryItem.update({
        where: { id },
        data: { quantity: body.quantity !== undefined ? set : { increment: add } },
      });
      if (Number(item.quantity) < 0) await prisma.inventoryItem.update({ where: { id }, data: { quantity: 0 } });
      global.io?.emit('stock:refresh');
      return NextResponse.json({ ...item, quantity: Math.max(0, Number(item.quantity)) });
    }
    const parsed = parseInventory(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { usages, ...data } = parsed.data;
    const item = await prisma.$transaction(async (tx) => {
      await tx.inventoryUsage.deleteMany({ where: { inventoryItemId: id } });
      return tx.inventoryItem.update({
        where: { id },
        data: { ...data, usages: { create: usages.map((u) => ({ productId: u.productId, amount: u.amount })) } },
      });
    });
    global.io?.emit('stock:refresh');
    return NextResponse.json(item);
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Ya existe un insumo con ese nombre' }, { status: 409 });
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.inventoryItem.delete({ where: { id } });
    global.io?.emit('stock:refresh');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }
}
