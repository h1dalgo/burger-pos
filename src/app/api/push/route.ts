import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pushEnabled } from '@/lib/push';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clave pública para suscribirse (vacía si el push no está configurado). */
export async function GET() {
  return NextResponse.json({ enabled: pushEnabled(), publicKey: pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null });
}

/** Guarda la suscripción de un mesero ("waiter") o del cliente de un pedido ("order"). */
export async function POST(request: NextRequest) {
  try {
    const { subscription, role, orderId } = await request.json();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000 || typeof p256dh !== 'string' || typeof auth !== 'string') {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }
    if (role !== 'waiter' && role !== 'order') return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    if (role === 'order' && (typeof orderId !== 'string' || !UUID_RE.test(orderId))) {
      return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
    }
    const data = { p256dh, auth, role, orderId: role === 'order' ? orderId : null };
    await prisma.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, ...data }, update: data });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    if (typeof endpoint === 'string') await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
