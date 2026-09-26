/* Notificaciones push de HOMI. Workbox lo carga dentro de sw.js (importScripts,
 * ver workbox-config.cjs). Aquí no hay React: es JavaScript del service worker. */

// Llega un push de la Edge Function send-push → mostrar la notificación.
// (En iPhone es obligatorio mostrar SIEMPRE una: si no, Safari retira el permiso.)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'HOMI', body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'HOMI', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png', // icono pequeño y monocromo de la barra de Android
      tag: data.tag, // mismo tag = sustituye a la anterior (p. ej. un chat)
      renotify: Boolean(data.tag), // …pero vuelve a sonar/vibrar
      lang: 'es',
      data: { url: data.url || '/' },
    }),
  );
});

// Tocar la notificación → abrir la app en la pantalla que toca.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const app = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (app) {
        // La app ya está abierta: se le pide que navegue (sin recargar) y se trae al frente.
        app.postMessage({ type: 'homi:navigate', path });
        return app.focus();
      }
      return self.clients.openWindow(path);
    })(),
  );
});
