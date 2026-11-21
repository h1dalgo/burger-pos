import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/business';
import { emailEnabled } from '@/lib/receipts';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recibo digital de un pedido. El id (UUID) funciona como enlace privado. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
  try {
    const [order, s] = await Promise.all([
      prisma.order.findUnique({
        where: { id },
        include: { items: { include: { variation: true, removedIngredients: true, addedExtras: true, selections: true } } },
      }),
      getSettings(),
    ]);
    if (!order) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    const { customerEmail, ...rest } = order;
    // el correo se muestra enmascarado: j***@gmail.com
    const maskedEmail = customerEmail ? customerEmail.replace(/^(.)[^@]*(@.*)$/, '$1***$2') : null;
    return NextResponse.json(
      {
        order: { ...rest, maskedEmail },
        business: {
          name: s.name,
          legalName: s.legalName,
          rif: s.rif,
          address: s.address,
          phone: s.phone,
          logoUrl: s.logoUrl,
          taxRate: Number(s.taxRate),
          receiptFooter: s.receiptFooter,
          timezone: s.timezone,
        },
        emailEnabled: emailEnabled(),
      },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
    );
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el recibo' }, { status: 500 });
  }
}
