import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignReceipt, baseUrlFrom, sendReceiptEmail } from '@/lib/receipts';

export const runtime = 'nodejs';

/**
 * Reenviar el recibo por correo (admin). Con { email } se corrige o agrega el
 * correo del cliente antes de enviar.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.email === 'string' && body.email.trim()) {
      const email = body.email.trim().toLowerCase().slice(0, 120);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
      await prisma.order.update({ where: { id }, data: { customerEmail: email } });
    }
    await assignReceipt(id);
    const r = await sendReceiptEmail(id, baseUrlFrom(request));
    if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo enviar' }, { status: 500 });
  }
}
