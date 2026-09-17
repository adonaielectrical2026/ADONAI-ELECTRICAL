// Modo sin conexión de ADONAI Herramientas Técnicas.
//
// Primero la red, para que cada cambio publicado llegue en cuanto hay señal;
// si no hay conexión, se sirve la última copia guardada. Así la app abre en una
// obra sin cobertura sin quedar nunca clavada en una versión vieja.
const CACHE = 'adonai-herramientas-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  // Google (Drive, inicio de sesión) y las fuentes van directo, sin guardar.
  if (new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(pedido)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(pedido).then((guardada) => guardada || caches.match('./index.html')))
  );
});
