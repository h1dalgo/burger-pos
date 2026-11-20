'use client';

/** Convierte la clave VAPID (base64url) al formato que pide el navegador. */
function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Suscribe este teléfono a notificaciones push (llegan con la app cerrada).
 * Devuelve false si el navegador o el servidor no lo permiten; en ese caso
 * siguen funcionando los avisos con la app abierta.
 */
export async function subscribePush(role: 'waiter' | 'order', orderId?: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    const info = await fetch('/api/push').then((r) => r.json());
    if (!info?.enabled || !info.publicKey) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(info.publicKey) });
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), role, orderId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
