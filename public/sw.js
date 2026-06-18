const CACHE_NAME = 'swift-driver-v1';

// Direct bootstrap shell files to cache upfront
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://img.icons8.com/color/512/taxi.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Offline Assets...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass caching for any API route (e.g., /api/chat-coach), Firestore, or socket requests
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Bypass caching for chrome-extension or other non-http schemes
  if (event.request.url.startsWith('chrome-extension') || !event.request.url.startsWith('http')) {
    return;
  }

  // Handle requests: Stale-While-Revalidate pattern of caching for PWA asset agility
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.log('[Service Worker] Fetch failed; returning offline cache if available.', err);
          // If offline and requesting document navigation, return index.html shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
