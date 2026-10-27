const CACHE_NAME = 'associate-engineers-v9';

self.addEventListener('install', (event) => {
  // Deliberately do not call skipWaiting() here. The page waits until current work is safe,
  // then sends AE_SKIP_WAITING to activate this worker automatically.
  event.waitUntil(Promise.resolve());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AE_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Do not intercept third-party requests (Firebase, fonts, CDNs, etc.).
  if (url.origin !== self.location.origin) return;

  // Network-first navigation ensures new Netlify HTML is available, with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // Don't cache deployment-validator requests. Let HEAD requests pass through (they are not GET).
  if (url.pathname === '/index.html' && url.searchParams.has('ae-version-check')) return;

  // Cache same-origin static assets, refreshing from network when missing.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
