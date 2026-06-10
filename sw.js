const CACHE = 'greenflow-v1';
const ASSETS = [
  '/', '/index.html', '/dispatch.html', '/patron.html', '/booking.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ne jamais intercepter les requêtes Firebase ou API
  if(e.request.url.includes('firebasedatabase') || e.request.url.includes('/api/') || e.request.url.includes('nominatim') || e.request.url.includes('osrm') || e.request.url.includes('mapbox')) {
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
