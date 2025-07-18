// Semantest PWA Service Worker
const CACHE_NAME = 'semantest-v1.0.0';
const RUNTIME_CACHE = 'semantest-runtime';
const API_CACHE = 'semantest-api';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard',
  '/tests',
  '/results',
  '/offline.html',
  '/css/app.css',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ROUTES = [
  '/api/auth/session',
  '/api/tests/recent',
  '/api/dashboard/stats'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request));
});

// Cache first strategy
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline.html');
    }
    
    throw error;
  }
}

// Network first strategy
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful API responses
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, checking cache:', request.url);
    
    const cache = await caches.open(API_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Serving API from cache:', request.url);
      return cached;
    }
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This data is not available offline'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-tests') {
    event.waitUntil(syncTests());
  } else if (event.tag === 'sync-results') {
    event.waitUntil(syncResults());
  }
});

// Sync offline tests
async function syncTests() {
  try {
    const db = await getIndexedDB();
    const tests = await db.getAllPendingTests();
    
    for (const test of tests) {
      await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test)
      });
      
      await db.markTestSynced(test.id);
    }
    
    // Notify clients of successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { tests: tests.length }
      });
    });
  } catch (error) {
    console.error('[SW] Test sync failed:', error);
  }
}

// Sync offline results
async function syncResults() {
  try {
    const db = await getIndexedDB();
    const results = await db.getAllPendingResults();
    
    for (const result of results) {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      
      await db.markResultSynced(result.id);
    }
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { results: results.length }
      });
    });
  } catch (error) {
    console.error('[SW] Result sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const options = {
    title: 'Semantest',
    body: 'You have new test results',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Results',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.title = data.title || options.title;
    options.body = data.body || options.body;
    options.data = data.data || options.data;
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/results')
    );
  }
});

// Periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-dashboard') {
    event.waitUntil(updateDashboard());
  }
});

// Update dashboard data
async function updateDashboard() {
  try {
    const response = await fetch('/api/dashboard/stats');
    const data = await response.json();
    
    const cache = await caches.open(API_CACHE);
    await cache.put('/api/dashboard/stats', new Response(JSON.stringify(data)));
    
    // Notify clients of update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DASHBOARD_UPDATE',
        data
      });
    });
  } catch (error) {
    console.error('[SW] Dashboard update failed:', error);
  }
}

// IndexedDB wrapper (simplified)
async function getIndexedDB() {
  return {
    getAllPendingTests: async () => {
      // Implementation would query IndexedDB
      return [];
    },
    markTestSynced: async (id) => {
      // Implementation would update IndexedDB
    },
    getAllPendingResults: async () => {
      // Implementation would query IndexedDB
      return [];
    },
    markResultSynced: async (id) => {
      // Implementation would update IndexedDB
    }
  };
}