/* ASSOCIATE ENGINEERS PWA Service Worker — Offline First Shell & CDN Asset Cache */
const CACHE_NAME = 'associate-engineers-v25';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  './',
  './index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Use allSettled so if any single external URL isn't reachable during install, the service worker still installs smoothly
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

  // Let Firestore network requests pass through directly (Firebase SDK manages its own IndexedDB offline cache)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return;
  }

  // 1. Navigation requests: App Shell (Direct launch offline guarantee)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // If online and fast, get latest /index.html
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
          // Network failed or device is offline - serve cached app shell immediately
        }

        const cached =
          (await caches.match(request, { ignoreSearch: true })) ||
          (await caches.match('/index.html')) ||
          (await caches.match('./index.html')) ||
          (await caches.match('/')) ||
          (await caches.match('./'));

        if (cached) return cached;

        // Last-ditch: find any cached HTML
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        for (const k of keys) {
          if (k.url.endsWith('.html') || k.url.endsWith('/')) {
            const match = await cache.match(k);
            if (match) return match;
          }
        }
        return new Response('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASSOCIATE ENGINEERS</title></head><body style="background:#030712;color:#f8fafc;font:16px sans-serif;padding:24px"><h2>ASSOCIATE ENGINEERS</h2><p>Please connect to the internet once to complete offline setup.</p></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      })()
    );
    return;
  }

  // 2. Cache-First for all static assets: fonts, CSS, scripts, CDN files, icons
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
        // If image request fails while offline, fallback to icon.svg if cached
        if (request.destination === 'image') {
          const fallbackIcon = await caches.match('/icon.svg');
          if (fallbackIcon) return fallbackIcon;
        }
        throw err;
      }
    })()
  );
});
