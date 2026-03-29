// Daily Log Service Worker
// Version: 1 — nie ändern, nur index.html updaten
const CACHE = 'daily-log-v1';
const ASSETS = ['./index.html', './manifest.json'];

// Install: cache the app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', function(e) {
  // Only handle same-origin requests
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Update cache with fresh response
      var clone = response.clone();
      caches.open(CACHE).then(function(cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function() {
      // Offline fallback
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
