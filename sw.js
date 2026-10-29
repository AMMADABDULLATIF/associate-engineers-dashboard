/* ASSOCIATE ENGINEERS PWA service worker — resilient online/offline shell and safe cache updates. */
const CACHE_NAME = 'associate-engineers-v11';
const APP_SHELL_URLS = ['/', '/index.html'];
const NAVIGATION_NETWORK_TIMEOUT_MS = 1800;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Pre-cache the app shell while online so the installed app can open offline later.
    await Promise.all(APP_SHELL_URLS.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (_) { /* First install may be offline; navigation handler remains defensive. */ }
    }));
    // The app's own safe-update code delays activation/reload when work is in progress.
    // Do not force skipWaiting here; it can interrupt an active session.
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

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(request, { cache: 'no-cache', signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never intercept Firebase, CDNs, fonts, or other cross-origin requests.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetchWithTimeout(request, NAVIGATION_NETWORK_TIMEOUT_MS);
        if (response && response.ok) {
          await cache.put('/index.html', response.clone());
          await cache.put('/', response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        const cached = await caches.match(request, { ignoreSearch: true }) ||
                       await caches.match('/index.html') ||
                       await caches.match('/');
        if (cached) return cached;
        return new Response('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#030712"><title>ASSOCIATE ENGINEERS</title></head><body style="margin:0;background:#030712;color:#f8fafc;font:16px system-ui;padding:24px"><h2>ASSOCIATE ENGINEERS</h2><p>This app has not been cached on this device yet. Connect to the internet once, open the app, and try again offline.</p></body></html>', {headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }

  // Cache same-origin static files for fast repeat visits; network fallback when absent.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      throw error;
    }
  })());
});
