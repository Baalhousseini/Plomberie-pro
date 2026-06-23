const CACHE_NAME = 'gf-v2';
const APP_SHELL = [
  '/index.html',
  '/dispatch.html',
  '/firebase-config.js'
];

// Install: cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL).catch(function() {});
    })
  );
  self.skipWaiting();
});

// Activate: purge old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Laisser passer Firebase, APIs externes, cartes
  if(
    url.includes('firebasedatabase') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('nominatim') ||
    url.includes('osrm') ||
    url.includes('mapbox') ||
    url.includes('cdn.') ||
    url.includes('/api/')
  ) { return; }

  // Uniquement GET
  if(e.request.method !== 'GET') return;

  // Navigation HTML : Network First → cache fallback
  if(e.request.mode === 'navigate' || url.endsWith('.html') || url === self.registration.scope) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(e.request)
          .then(function(cached) { return cached || caches.match('/index.html'); });
      })
    );
    return;
  }

  // Ressources statiques (JS, CSS, images) : Cache First, mise à jour fond de tâche
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(response) {
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, response.clone()); });
        return response;
      }).catch(function() {});

      return cached || fetchPromise;
    })
  );
});

// Réception message du client (ex: forcer mise en cache d'une URL)
self.addEventListener('message', function(e) {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
