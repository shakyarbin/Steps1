const CACHE_NAME = 'step-counter-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/report.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Background sync for step data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-steps') {
    event.waitUntil(syncSteps());
  }
});

async function syncSteps() {
  const data = await clients.matchAll();
  data.forEach(client => {
    client.postMessage({ type: 'sync-steps' });
  });
} 