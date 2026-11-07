const CACHE_NAME = 'tecnoaldy-v3';

self.addEventListener('install', event => {
  self.skipWaiting(); // Obliga a instalarse de inmediato
});

self.addEventListener('activate', event => {
  // Borra cualquier memoria caché vieja que haya quedado
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ESTRATEGIA: Internet Primero, Caché como respaldo
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si hay internet y hay algo nuevo, lo descarga y lo guarda en el caché
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Si no hay internet, saca la página guardada del caché
        return caches.match(event.request);
      })
  );
});