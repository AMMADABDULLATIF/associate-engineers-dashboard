const CACHE_NAME = 'associate-engineers-v10';

self.addEventListener('install', (event) => {
  // Cache the app shell during install so the login page can open offline after the app has been installed once online.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch('/index.html', { cache: 'no-cache' });
      if (response && response.ok) {
        await cache.put('/index.html', response.clone());
        await cache.put('/', response.clone());
      }
    } catch (error) {
      // First installation needs an online visit; keep install resilient if precaching fails.
      console.warn('Could not pre-cache app shell during install:', error);
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AE_SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name =>
      name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()
    ));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Firebase and CDN requests remain network-only; local login works from the cached app shell.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/index.html' && url.searchParams.has('ae-version-check')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
          await cache.put('/', response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request) || await cache.match('/index.html') || await cache.match('/');
        if (cached) return cached;
        return new Response('ASSOCIATE ENGINEERS Dashboard is not cached yet. Open the app online once, then it can work offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      throw error;
    }
  })());
});
