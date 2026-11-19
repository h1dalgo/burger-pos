/*
 * Service worker de Burger POS.
 *  - Solo intercepta la navegación entre páginas: si el servidor no responde
 *    (sin conexión) o responde 502/503 (Render despertando el servicio),
 *    muestra /offline.html, que reintenta solo. No guarda otras páginas en
 *    caché, así nunca se ve una versión vieja de la app.
 *  - Permite mostrar el aviso de "¡Tu pedido está listo!" como notificación.
 */
const CACHE = 'burger-pos-shell-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode !== 'navigate') return; // imágenes, API, etc.: comportamiento normal
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.status === 502 || res.status === 503) {
          return caches.match(OFFLINE_URL).then((offline) => offline || res);
        }
        return res;
      })
      .catch(() => caches.match(OFFLINE_URL).then((offline) => offline || Response.error()))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/menu';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })
  );
});
