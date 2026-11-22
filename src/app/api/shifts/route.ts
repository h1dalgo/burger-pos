import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit, money } from '@/lib/audit';
import { closeShift, parseAmount, shiftTotals } from '@/lib/shifts';

export const runtime = 'nodejs';

const personFrom = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().length <= 40 ? v.trim() : null);

/**
 * Caja del mesero: ver su turno abierto. No se devuelve el efectivo esperado
 * (cierre "a ciegas": el mesero cuenta sin saber cuánto debería haber).
 */
export async function GET(request: NextRequest) {
  const person = personFrom(request.nextUrl.searchParams.get('person'));
  if (!person) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });
  try {
    const shift = await prisma.cashShift.findFirst({ where: { person, closedAt: null }, orderBy: { openedAt: 'desc' } });
    if (!shift) return NextResponse.json({ shift: null });
    const totals = await shiftTotals(person, shift.openedAt, new Date());
    return NextResponse.json({
      shift: { id: shift.id, person: shift.person, openedAt: shift.openedAt, openingCash: Number(shift.openingCash) },
      cobros: totals.count,
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar la caja' }, { status: 500 });
  }
}

/** Abrir caja ({ action: 'open', person, openingCash }) o cerrarla ({ action: 'close', person, id, countedCash, note }). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const person = personFrom(body.person);
    if (!person) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });

    if (body.action === 'open') {
      const opening = parseAmount(body.openingCash);
      if (opening === null) return NextResponse.json({ error: 'Monto inicial inválido' }, { status: 400 });
      const open = await prisma.cashShift.findFirst({ where: { person, closedAt: null } });
      if (open) return NextResponse.json({ error: 'Ya tienes una caja abierta' }, { status: 409 });
      const shift = await prisma.cashShift.create({ data: { person, openingCash: opening } });
      await audit(person, 'CAJA_ABIERTA', `Inicial ${money(opening)}`);
      return NextResponse.json({ shift: { id: shift.id, person, openedAt: shift.openedAt, openingCash: opening } }, { status: 201 });
    }

    if (body.action === 'close') {
      const counted = parseAmount(body.countedCash);
      if (counted === null) return NextResponse.json({ error: 'Monto contado inválido' }, { status: 400 });
      const shift = typeof body.id === 'string' ? await prisma.cashShift.findUnique({ where: { id: body.id } }) : null;
      if (!shift || shift.person !== person) return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 });
      if (shift.closedAt) return NextResponse.json({ error: 'Esta caja ya se cerró' }, { status: 409 });
      const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : null;
      const res = await closeShift(shift.id, counted, person, note);
      if (!res) return NextResponse.json({ error: 'Esta caja ya se cerró' }, { status: 409 });
      await audit(person, 'CAJA_CERRADA', `Esperado ${money(res.expected)} · Contado ${money(counted)} · Diferencia ${res.difference >= 0 ? '+' : '−'}${money(Math.abs(res.difference))}${note ? ` · ${note}` : ''}`);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar la caja' }, { status: 500 });
  }
}
