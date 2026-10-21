const CACHE_NAME = 'associate-engineers-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Foran naya version activate karega
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Purani memory clear karega
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});