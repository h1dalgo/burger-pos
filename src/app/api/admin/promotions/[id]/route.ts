import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parsePromotion } from '../parse';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    // solo activar / desactivar
    if (Object.keys(body).length === 1 && typeof body.active === 'boolean') {
      const p = await prisma.promotion.update({ where: { id }, data: { active: body.active } });
      global.io?.emit('settings:updated');
      return NextResponse.json(p);
    }
    const parsed = parsePromotion(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const p = await prisma.promotion.update({ where: { id }, data: parsed.data });
    global.io?.emit('settings:updated');
    return NextResponse.json(p);
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Ya existe un cupón con ese código' }, { status: 409 });
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.promotion.delete({ where: { id } });
    global.io?.emit('settings:updated');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }
}
