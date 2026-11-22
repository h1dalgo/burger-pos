import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-labels';

export const runtime = 'nodejs';

/** Registro de acciones (?from&to&action&actor&orderId). Lo más nuevo primero, máx. 500. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const orderId = sp.get('orderId');
  const action = sp.get('action');
  const actor = sp.get('actor')?.trim();
  const from = sp.get('from') ? new Date(sp.get('from')!) : null;
  const to = sp.get('to') ? new Date(sp.get('to')!) : null;
  if ((from && isNaN(+from)) || (to && isNaN(+to))) return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        ...(orderId ? { orderId } : {}),
        ...(action && action in AUDIT_ACTIONS ? { action } : {}),
        ...(actor ? { actor: { contains: actor, mode: 'insensitive' as const } } : {}),
        ...(from || to ? { at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      orderBy: { at: 'desc' },
      take: 500,
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el registro' }, { status: 500 });
  }
}
