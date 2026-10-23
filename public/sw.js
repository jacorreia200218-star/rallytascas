/* Service worker do Rally Gastronómico.
 * - Guarda todos os ficheiros da app em cache no 1.º arranque (funciona offline).
 * - Só trata pedidos GET ao próprio endereço; nunca contacta outros servidores.
 * - Para publicar uma nova versão: mude VERSION (a cache antiga é apagada).
 */
const VERSION = 'v3';
const CACHE = `rally-gastronomico-${VERSION}`;

// Mantenha esta lista igual aos ficheiros de public/ (há um teste que o verifica).
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/challenges.js',
  'js/data.js',
  'js/db.js',
  'js/diagnostico.js',
  'js/imaging.js',
  'js/logic.js',
  'js/photos.js',
  'js/session.js',
  'js/store.js',
  'js/transfer.js',
  'js/ui.js',
  'js/zip.js',
  'js/views/desafio.js',
  'js/views/galeria.js',
  'js/views/mais.js',
  'js/views/paragem.js',
  'js/views/ranking.js',
  'js/views/roteiro.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' evita copiar versões antigas da cache HTTP do navegador
    await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('rally-gastronomico-') && k !== CACHE).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nunca interceptar outros servidores

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      // Navegação offline para um endereço que não está em cache: devolve a app.
      if (req.mode === 'navigate') {
        const shell = await cache.match('index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
