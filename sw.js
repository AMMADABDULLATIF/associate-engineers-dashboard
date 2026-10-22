const CACHE_NAME = 'associate-engineers-v4'; // Version change karein har baar naya code dalte waqt

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Foran naya version activate karega
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Purani memory clear karega
  // Purane cache ko delete karega
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});