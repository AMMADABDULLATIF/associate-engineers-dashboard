/* ASSOCIATE ENGINEERS PWA — offline shell plus cached static CDN dependencies. */
const CACHE_NAME = 'associate-engineers-v13';
const APP_SHELL_URLS = ['/', '/index.html'];
const NAVIGATION_NETWORK_TIMEOUT_MS = 1800;
const ASSET_CACHE_TIMEOUT_MS = 6500;

// These are the external, read-only libraries/styles required to render the app.
// Firebase data requests are NOT cached; only its SDK scripts are.
const CORE_EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
];
const CACHEABLE_EXTERNAL_HOSTS = new Set([
  'cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com',
  'fonts.gstatic.com', 'cdn.jsdelivr.net', 'www.gstatic.com'
]);

async function fetchWithTimeout(request, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(request, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL_URLS.map(async url => {
      try {
        const response = await fetchWithTimeout(url, ASSET_CACHE_TIMEOUT_MS, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (_) { /* Offline first install cannot create a shell cache. */ }
    }));
    // Warm the CDN cache on first successful online install. Opaque no-CORS
    // responses are cacheable and allow styles/scripts to remain available offline.
    await Promise.all(CORE_EXTERNAL_ASSETS.map(async assetUrl => {
      try {
        const request = new Request(assetUrl, { mode: 'no-cors', credentials: 'omit' });
        const response = await fetchWithTimeout(request, ASSET_CACHE_TIMEOUT_MS, { cache: 'reload' });
        if (response && (response.ok || response.type === 'opaque')) {
          await cache.put(request, response.clone());
        }
      } catch (_) { /* A failed optional CDN must not prevent app installation. */ }
    }));
    // Keep activation under the app's existing safe-update controller.
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'AE_SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('associate-engineers-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (!CACHEABLE_EXTERNAL_HOSTS.has(url.hostname)) return;
    // Cache-first for immutable/static CDN assets: fast offline rendering and no
    // repeated multi-second network waits when the device is disconnected.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        // Let the browser handle an uncached resource failure gracefully.
        throw error;
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetchWithTimeout(request, NAVIGATION_NETWORK_TIMEOUT_MS, { cache: 'no-cache' });
        if (response && response.ok) {
          await cache.put('/index.html', response.clone());
          await cache.put('/', response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        const cached = await cache.match(request, { ignoreSearch: true }) ||
                       await cache.match('/index.html') || await cache.match('/');
        if (cached) return cached;
        return new Response('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#030712"><title>ASSOCIATE ENGINEERS</title></head><body style="margin:0;background:#030712;color:#f8fafc;font:16px system-ui;padding:24px"><h2>ASSOCIATE ENGINEERS</h2><p>This app has not been cached on this device yet. Connect to the internet once, open the app, and try again offline.</p></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // Same-origin static assets: cache-first with network fill.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
