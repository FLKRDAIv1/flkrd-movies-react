const CACHE_NAME = 'flkrd-movies-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/sitemap.xml',
  '/manifest.json'
];

// Install Event: Cache essential core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First for APIs with fallback, Cache-First for static JS/CSS & Images
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and cross-origin iframe video streams
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // TMDB API Response Cache-First / Network-Fallback Strategy
  if (url.origin.includes('image.tmdb.org') || url.pathname.startsWith('/api/tmdb') || url.origin.includes('api.tmdb.org')) {
    event.respondWith(
      caches.open('flkrd-tmdb-cache').then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          // Fetch updated version silently in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse);
            }
          }).catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return cachedResponse || Response.error();
        }
      })
    );
    return;
  }

  // Static Assets (JS, CSS, WebP, Fonts) Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse || new Response('Asset unavailable offline', { status: 404, statusText: 'Not Found' });
      });

      return cachedResponse || fetchPromise;
    }).catch(() => new Response('Asset unavailable offline', { status: 404, statusText: 'Not Found' }))
  );
});
