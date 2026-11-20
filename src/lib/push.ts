/**
 * Notificaciones push (llegan aunque la app esté cerrada).
 * Requiere las variables VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY; si faltan,
 * todo sigue funcionando sin push.
 */
import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let ready: boolean | null = null;

export function pushEnabled() {
  if (ready !== null) return ready;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (ready = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
    ready = true;
  } catch (e) {
    console.error('VAPID inválido:', e);
    ready = false;
  }
  return ready;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Envía a los meseros y/o al cliente de un pedido. Borra suscripciones vencidas. */
export async function sendPush(target: { role: 'waiter' } | { orderId: string }, payload: PushPayload) {
  if (!pushEnabled()) return;
  const subs = await prisma.pushSubscription.findMany({
    where: 'role' in target ? { role: 'waiter' } : { role: 'order', orderId: target.orderId },
  });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 600 });
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    })
  );
}
