const CACHE_NAME = 'associate-engineers-v6'; // Version ko v6 kar diya hai

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

// YEH SABSE ZAROORI HAI (Cache First Strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Agar file phone ki memory (cache) mein hai, toh foran dikhao
      return cachedResponse || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    }).catch(() => {
      // Agar internet nahi hai aur file memory mein bhi nahi, toh index.html dikhao
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});