self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('plant-disease-cache-v1').then(function(cache) {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/service-worker.js',
        // Add more static assets as needed
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
