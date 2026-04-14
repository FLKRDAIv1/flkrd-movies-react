const CACHE_NAME = 'flkrd-movies-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
];

// Comprehensive Real-Time Ad & Tracker Blocklist (Mimicking AdGuard DNS)
// These domains cover major popunder networks, tracking scripts, and ad servers
// commonly found on free streaming sources.
const adBlocklist = [
  'doubleclick.net', 'adsystem.com', 'popads.net', 'popcash.net',
  'exoclick.com', 'propellerads.com', 'yllix.com', 'adsterra.com',
  'infolinks.com', 'chitika.com', 'bidvertiser.com', 'revenuehits.com',
  'juicyads.com', 'eroadvertising.com', 'trafficjunky.com', 'adcash.com',
  'cpmstar.com', 'adxion.com', 'ad-delivery.net', 'adserver.yahoo.com',
  'ads.pubmatic.com', 'ad.yieldmanager.com', 'google-analytics.com',
  'googlesyndication.com', 'quantserve.com', 'scorecardresearch.com',
  'zedo.com', 'taboola.com', 'outbrain.com', 'mgid.com', 'revcontent.com',
  'content.ad', 'disqusads.com', 'viglink.com', 'skimlinks.com',
  'sharethis.com', 'addthis.com', 'amazon-adsystem.com', 'criteo.com',
  'rubiconproject.com', 'openx.net', 'indexexchange.com', 'appnexus.com',
  'spotxchange.com', 'teads.tv', 'unrulyx.com', 'tremorhub.com',
  'vungle.com', 'chartboost.com', 'inmobi.com', 'startapp.com', 'airpush.com',
  'leadbolt.com', 'tapjoy.com', 'flurry.com', 'mopub.com', 'smaato.com',
  'adcolony.com', 'unityads.unity3d.com', 'facebook.com/tr/', 'tiktok.com/api/ad/',
  'api.mixpanel.com', 'track.hubspot.com', 'bat.bing.com',
  // Video player specific ad servers often used for pre-rolls/pop-unders
  'syndication.exdynsrv.com', 'main.exdynsrv.com', 's.mcdn.to',
  's.mcloud.to', 's.vizcloud.online', 'streamhub.to/js/pop.js',
  'terabox.com/api/ad', 'terabox.app/api/ad',
  // Specific vidking/streaming popups
  'tsyndicate.com', 'onclickalgo.com', 'onclickperformance.com',
  'bet365.com', '1xbet.com', 'mybet.com', 'vidking.net/assets/ads',
  'vidking.net/delivery', 'awin1.com', 'tracking.su', 'jads.co',
  'cpmrevenuegate.com', 'sh.st', 'clkmon.com', 'reimageplus.com',
  'cloudfront.net/pop', 'directrev.com', 'adkmob.com'
];

// Helper to check if a URL matches the ad blocklist
const isAdRequest = (url) => {
  try {
    const requestUrl = new URL(url);
    const host = requestUrl.hostname;
    const fullUrl = requestUrl.href;

    // Exact or subdomain match for ad domains
    return adBlocklist.some(adDomain =>
      host === adDomain ||
      host.endsWith(`.${adDomain}`) ||
      fullUrl.includes(adDomain)
    );
  } catch (e) {
    // If URL parsing fails, play it safe and allow it (fallback)
    return false;
  }
};

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache v2');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // --- REAL-TIME AD BLOCKER INTERCEPTION ---
  if (isAdRequest(event.request.url)) {
    console.log(`[Flkrd AdBlocker] Intercepted and blocked: ${event.request.url}`);
    // Immediately return an empty placeholder response to stop the ad from loading
    event.respondWith(
      new Response(null, {
        status: 200, // Return 200 to prevent console errors from some players, but with no content
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        })
      })
    );
    return;
  }
  // -----------------------------------------

  // --- ENGINE V5: ADAPTIVE NETWORK POLICY ---
  // Bypass caching entirely for non-GET methods (POST, DELETE, PUT, PATCH)
  // This ensures Admin Panel operations (remove/edit) always talk to the server
  if (event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request).catch(err => {
        console.warn("[SW] Background fetch failed for non-GET method:", err);
        return new Response(JSON.stringify({ error: 'Network failure', message: err.message }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Bypass caching completely for local development and Vite HMR
  const url = new URL(event.request.url);
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.startsWith('192.168.') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('upstash.io') ||
    url.hostname.includes('themoviedb.org') ||
    url.searchParams.has('import')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // --- STALE-WHILE-REVALIDATE CACHING STRATEGY ---
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Only cache valid standard responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Final fallback to ensure event.respondWith never receives undefined
        // Using 404 for missing resources instead of 503 to avoid console noise
        return cachedResponse || new Response('Resource unavailable offline', { status: 404, statusText: 'Not Found' });
      });

      // Serve cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Robust Background Notification Handler (Novu & Generic Support)
self.addEventListener('push', event => {
  let data = {
    title: 'New Transmission',
    body: 'Synchronizing new content archive.',
    icon: 'https://i.imgur.com/DF1UZL3.png'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      // Handle Novu Payload Structure
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
        data.icon = payload.notification.icon || data.icon;
        data.url = payload.data?.url;
      } else {
        data = { ...data, ...payload };
      }
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://i.imgur.com/DF1UZL3.png',
    badge: 'https://i.imgur.com/DF1UZL3.png',
    vibrate: [200, 100, 200, 100, 400],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open Node' },
      { action: 'close', title: 'Dismiss' }
    ],
    tag: 'flkrd-notification-sync',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});