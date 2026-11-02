/* ASSOCIATE ENGINEERS PWA Service Worker — 100% Offline-First Architecture */
const CACHE_NAME = 'ae-dashboard-v14-offline-first';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/assets/xlsx.full.min.js',
  '/assets/firebase-app-compat.js',
  '/assets/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Precache critical shell files defensively
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async url => {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (resp && resp.ok) {
              await cache.put(url, resp.clone());
            }
          } catch (_) {
            // First install may occur in low/no connectivity
          }
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Claim clients immediately so this SW controls the page on first load
      await self.clients.claim();
      // Remove any outdated caches
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k.startsWith('ae-') && k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data && (event.data.type === 'AE_SKIP_WAITING' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Navigation requests (Opening the app / refreshing / direct URL)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // If completely offline, return cached HTML immediately in 0ms!
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const cached = await cache.match('/index.html') || await cache.match('/');
          if (cached) return cached;
        }

        // If online or unknown, try network with short timeout then fall back to cache
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);
          const networkResponse = await fetch(request, {
            cache: 'no-cache',
            signal: controller.signal
          });
          clearTimeout(timer);

          if (networkResponse && networkResponse.ok) {
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            cache.put('/', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (_) {
          // Network failed or timed out — seamlessly use cache
        }

        const cachedResponse = await cache.match(request, { ignoreSearch: true }) ||
                               await cache.match('/index.html') ||
                               await cache.match('/');
        if (cachedResponse) {
          return cachedResponse;
        }

        // Emergency fallback: Return self-contained offline shell so Chrome dinosaur NEVER appears!
        return new Response(
          `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASSOCIATE ENGINEERS</title><style>body{background:#030712;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}h1{color:#62e5f5;font-size:20px;margin-bottom:8px;}p{color:#94a3b8;font-size:14px;line-height:1.5;max-width:380px;}button{margin-top:16px;background:#62e5f5;color:#080b17;border:none;padding:10px 20px;border-radius:10px;font-weight:bold;cursor:pointer;}</style></head><body><div><h1>ASSOCIATE ENGINEERS</h1><p>Offline Mode Active. Returning to your saved site dashboard...</p><button onclick="window.location.href='/'">Open Dashboard</button><script>setTimeout(function(){window.location.href='/';}, 400);</script></div></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // 2. Same-origin static assets: Cache-First strategy
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        } catch (error) {
          // If asset is missing while offline, return clean empty response instead of fatal error
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1e293b"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          throw error;
        }
      })()
    );
    return;
  }

  // 3. Cross-origin requests (CDNs, Google Fonts, etc.)
  // Stale-While-Revalidate so they are cached locally on first load and work offline forever!
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
