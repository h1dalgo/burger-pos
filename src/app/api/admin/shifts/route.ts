import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit, money } from '@/lib/audit';
import { closeShift, expectedCash, parseAmount, shiftTotals } from '@/lib/shifts';

export const runtime = 'nodejs';

/** Turnos de caja entre dos fechas (?from=ISO&to=ISO). Los abiertos traen lo esperado hasta ahora. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = new Date(sp.get('from') || Date.now() - 24 * 3600 * 1000);
  const to = new Date(sp.get('to') || Date.now());
  if (isNaN(+from) || isNaN(+to)) return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
  try {
    // los que se abrieron en el período + los que siguen abiertos
    const shifts = await prisma.cashShift.findMany({
      where: { OR: [{ openedAt: { gte: from, lte: to } }, { closedAt: null }] },
      orderBy: { openedAt: 'desc' },
      take: 300,
    });
    const rows = await Promise.all(
      shifts.map(async (s) => {
        const totals = await shiftTotals(s.person, s.openedAt, s.closedAt ?? new Date());
        const opening = Number(s.openingCash);
        const expected = s.expectedCash != null ? Number(s.expectedCash) : expectedCash(opening, totals);
        const counted = s.countedCash != null ? Number(s.countedCash) : null;
        return {
          id: s.id,
          person: s.person,
          openedAt: s.openedAt,
          closedAt: s.closedAt,
          closedBy: s.closedBy,
          note: s.note,
          openingCash: opening,
          expectedCash: expected,
          countedCash: counted,
          difference: counted != null ? Math.round((counted - expected) * 100) / 100 : null,
          totals,
        };
      })
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar los turnos' }, { status: 500 });
  }
}

/** El admin cierra un turno que quedó abierto ({ id, countedCash, note }). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const counted = parseAmount(body.countedCash);
    if (typeof body.id !== 'string' || counted === null) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : null;
    const res = await closeShift(body.id, counted, 'Admin', note);
    if (!res) return NextResponse.json({ error: 'El turno no existe o ya se cerró' }, { status: 409 });
    await audit('Admin', 'CAJA_CERRADA', `Turno de ${res.shift.person} · Esperado ${money(res.expected)} · Contado ${money(counted)} · Diferencia ${res.difference >= 0 ? '+' : '−'}${money(Math.abs(res.difference))}${note ? ` · ${note}` : ''}`);
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ error: 'No se pudo cerrar el turno' }, { status: 500 });
  }
}
