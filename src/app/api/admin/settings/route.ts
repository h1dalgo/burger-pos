import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/business';

export const runtime = 'nodejs';

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null);

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await getSettings();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = text(body.name, 60);
      if (!name) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
      data.name = name;
    }
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
    if (body.tableCount !== undefined) {
      const n = Number(body.tableCount);
      if (!Number.isInteger(n) || n < 1 || n > 200) return NextResponse.json({ error: 'Número de mesas inválido' }, { status: 400 });
      data.tableCount = n;
    }
    if (body.exchangeRate !== undefined) {
      const r = Number(body.exchangeRate);
      if (!Number.isFinite(r) || r < 0 || r > 1_000_000) return NextResponse.json({ error: 'Tasa inválida' }, { status: 400 });
      if (r !== Number(current.exchangeRate)) {
        data.exchangeRate = r;
        data.rateUpdatedAt = new Date();
      }
    }
    if (body.isOpen !== undefined) data.isOpen = !!body.isOpen;
    for (const key of ['openTime', 'closeTime'] as const) {
      if (body[key] !== undefined) {
        const v = text(body[key], 5);
        if (v && !HHMM.test(v)) return NextResponse.json({ error: 'Hora inválida (usa HH:MM)' }, { status: 400 });
        data[key] = v;
      }
    }
    if (body.pagoMovilBank !== undefined) data.pagoMovilBank = text(body.pagoMovilBank, 60);
    if (body.pagoMovilPhone !== undefined) data.pagoMovilPhone = text(body.pagoMovilPhone, 20);
    if (body.pagoMovilId !== undefined) data.pagoMovilId = text(body.pagoMovilId, 20);
    // Datos del emisor para el recibo digital
    if (body.legalName !== undefined) data.legalName = text(body.legalName, 120);
    if (body.rif !== undefined) data.rif = text(body.rif, 20)?.toUpperCase() ?? null;
    if (body.address !== undefined) data.address = text(body.address, 200);
    if (body.phone !== undefined) data.phone = text(body.phone, 30);
    if (body.receiptFooter !== undefined) data.receiptFooter = text(body.receiptFooter, 160);
    if (body.taxRate !== undefined) {
      const t = Number(body.taxRate);
      if (!Number.isFinite(t) || t < 0 || t > 50) return NextResponse.json({ error: 'IVA inválido' }, { status: 400 });
      data.taxRate = t;
    }

    const settings = await prisma.businessSettings.update({ where: { id: current.id }, data });
    // el menú abierto en los teléfonos se entera (tasa, horario)
    global.io?.emit('settings:updated');
    return NextResponse.json({ ...settings, exchangeRate: Number(settings.exchangeRate) });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
