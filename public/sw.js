/* ASSOCIATE ENGINEERS PWA Service Worker — Offline First Shell, Vite Chunk Cache & CDN Asset Cache */
const CACHE_NAME = 'associate-engineers-v41';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async url => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response && (response.ok || response.type === 'opaque')) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn('Pre-cache skip for:', url, err);
          }
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => k.startsWith('associate-engineers-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'AE_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let Vite dev modules & HMR endpoints pass straight to network
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/@vite') ||
      url.pathname.startsWith('/@react-refresh') ||
      url.pathname.startsWith('/@fs/') ||
      url.pathname.startsWith('/node_modules/'))
  ) {
    return;
  }

  // Let Firestore / Google API requests pass through directly
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return;
  }

  // 1. Navigation requests: App Shell (Network-first with quick fallback for instant offline launch)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1400);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timer);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            cache.put('/', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (_) {
          // Offline or slow network — serve cached shell immediately
        }

        const cached =
          (await caches.match(request, { ignoreSearch: true })) ||
          (await caches.match('/index.html')) ||
          (await caches.match('/'));

        if (cached) return cached;

        return new Response(
          '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASSOCIATE ENGINEERS</title></head><body style="background:#030712;color:#f8fafc;font:16px sans-serif;padding:24px"><h2>ASSOCIATE ENGINEERS</h2><p>Please connect to the internet once to complete offline setup.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // 2. Cache-First for hashed Vite JS/CSS chunks (/assets/*), fonts, icons, and CDN scripts
  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (err) {
        if (request.destination === 'image') {
          const fallbackIcon = await caches.match('/pwa-192x192.png');
          if (fallbackIcon) return fallbackIcon;
        }
        throw err;
      }
    })()
  );
});