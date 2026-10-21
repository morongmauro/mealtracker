// Service worker de Meal Tracker — notificaciones push y nada de caché.
//
// El handler de fetch NO guarda nada: deja pasar cada petición tal cual (así
// la auto-actualización de la app por version.json sigue mandando). Está
// porque sin un handler de fetch «real» Samsung Internet (y Chrome viejos)
// no tratan la app como instalable: «Agregar a pantalla de inicio» creaba un
// acceso directo con la insignia del navegador, que abre con la barra de
// direcciones, en vez de la app a pantalla completa.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;      // lo demás, directo a la red
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Entrena con Método';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'ecm',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // A dónde abre (?ir=entreno…): con la app ya abierta se le avisa por
      // mensaje; cerrada, va en el enlace.
      let ir = null;
      try { ir = new URL(url, self.location.origin).searchParams.get('ir'); } catch (e) {}
      for (const c of list) {
        if ('focus' in c) {
          if (ir) { try { c.postMessage({ ir }); } catch (e) {} }
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
