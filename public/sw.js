const CACHE_NAME = 'genomics-v1.0.2';
const STATIC_CACHE = 'genomics-static-v1.0.2';

// Only cache basic resources that we know exist
const STATIC_ASSETS = [
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log('[SW] Caching manifest');
      try {
        await cache.add('/manifest.json');
        console.log('[SW] Manifest cached successfully');
      } catch (error) {
        console.warn('[SW] Failed to cache manifest:', error);
      }
      return cache;
    }).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocol requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip authentication and API requests to avoid redirect issues
  if (url.pathname.startsWith('/api/auth') || 
      url.pathname.startsWith('/_next/') ||
      url.pathname.includes('auth') ||
      url.pathname.includes('login')) {
    return;
  }

  // Only handle manifest requests
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});

// Handle push notifications (basic)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/manifest.json',
    data: data.data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});