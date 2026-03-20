const CACHE_NAME = 'chukipu-v1';
const STATIC_ASSETS = [
  '/logos/chukipu-logo-pink.png',
  '/logos/chukipu-logo-brown.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Cache-first for static assets
  if (
    request.destination === 'image' ||
    url.pathname.startsWith('/logos/') ||
    url.pathname.startsWith('/img/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Network-first for everything else (API, Next.js pages, etc.)
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached || new Response('', { status: 503 }))
    )
  );
});
