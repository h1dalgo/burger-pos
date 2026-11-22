import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { parsePromotion } from './parse';

export const runtime = 'nodejs';

export async function GET() {
  const promos = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(promos.map((p) => ({ ...p, value: Number(p.value), minTotal: Number(p.minTotal) })));
}

export async function POST(request: NextRequest) {
  try {
    const parsed = parsePromotion(await request.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const promo = await prisma.promotion.create({ data: parsed.data });
    global.io?.emit('settings:updated');
    await audit('Admin', 'PROMO_CREADA', promo.name);
    return NextResponse.json(promo, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Ya existe un cupón con ese código' }, { status: 409 });
    return NextResponse.json({ error: 'No se pudo crear la promoción' }, { status: 500 });
  }
}
