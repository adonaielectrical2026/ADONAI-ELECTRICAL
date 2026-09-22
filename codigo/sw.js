// Modo sin conexión de ADONAI Herramientas Técnicas.
//
// Se precargan los recursos esenciales para que la app pueda abrirse sin señal
// desde la primera instalación. Después se usa red primero y la caché queda
// como respaldo con la última versión descargada correctamente.
const CACHE = 'adonai-herramientas-v16';
const PRECACHE = [
  './',
  './index.html',
  './estilos.css',
  './app.js',
  './manifest.json',
  './favicon.ico',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './logo.png',
  './jspdf.umd.min.js',
  './jspdf.plugin.autotable.min.js',
  './img/medidas.json',
  './img/adonai-logo-transparente.webp',
  './img/adonai-logo-y-nombre.webp',
  './img/blind-module.webp',
  './img/buttons-start-stop.webp',
  './img/control-metal-door.webp',
  './img/control-metal.webp',
  './img/modular-contactor.webp',
  './img/motor-guard.webp',
  './img/overload-relay.webp',
  './img/power-contactor.webp',
  './img/rcd-2p.webp',
  './img/rcd-4p.webp',
  './img/surge-3p.webp',
  './img/terminal-earth.webp',
  './img/terminal-feed.webp',
  './img/terminal-neutral.webp',
  './img/thermal-1p.webp',
  './img/thermal-2p.webp',
  './img/thermal-4p.webp',
  './img/timer-din.webp',
  './img/wall-12-cover.webp',
  './img/wall-12.webp',
  './img/wall-24-cover.webp',
  './img/wall-24.webp',
  './img/wall-36-cover.webp',
  './img/wall-36.webp',
  './img/wall-48-cover.webp',
  './img/wall-48.webp'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

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
  const url = new URL(pedido.url);
  // Google (Drive, inicio de sesión) y las fuentes van directo, sin guardar.
  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    fetch(pedido)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const guardada = await caches.match(pedido);
        if (guardada) return guardada;
        if (pedido.mode === 'navigate') return caches.match('./index.html');
        return new Response('Sin conexión y recurso no disponible en caché.', { status: 503, statusText: 'Offline' });
      })
  );
});
