import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** El cliente califica su pedido (una sola vez, cuando ya está listo o entregado). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { rating, comment } = await request.json();
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return NextResponse.json({ error: 'Calificación inválida' }, { status: 400 });
    const order = await prisma.order.findUnique({ where: { id }, select: { status: true, rating: true } });
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (order.status !== 'READY' && order.status !== 'DELIVERED') return NextResponse.json({ error: 'Aún no puedes calificar este pedido' }, { status: 409 });
    if (order.rating) return NextResponse.json({ error: 'Ya calificaste este pedido' }, { status: 409 });
    const updated = await prisma.order.update({
      where: { id },
      data: { rating: r, ratingComment: typeof comment === 'string' && comment.trim() ? comment.trim().slice(0, 300) : null },
      select: { id: true, rating: true, ratingComment: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la calificación' }, { status: 500 });
  }
}
