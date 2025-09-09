// AuraCast Service Worker for Offline Collaboration
// Handles caching, background sync, and offline functionality

const CACHE_NAME = 'auracast-v1.0.0';
const API_CACHE_NAME = 'auracast-api-v1.0.0';

// Resources to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets as needed
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/zones',
  '/api/forecasts',
  '/api/health-tips',
  '/api/user-preferences',
  '/api/collaborative-sessions',
  '/api/chat-messages',
  '/api/annotations',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('Service Worker: Caching static resources');
      await cache.addAll(STATIC_CACHE_URLS);
    })()
  );

  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => caches.delete(name))
      );

      // Take control of all clients
      await self.clients.claim();
      console.log('Service Worker: Activated and controlling clients');
    })()
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  if (isStaticResource(url)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default fetch for other requests
  event.respondWith(fetch(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-chat') {
    event.waitUntil(syncChatMessages());
  }

  if (event.tag === 'background-sync-annotations') {
    event.waitUntil(syncAnnotations());
  }

  if (event.tag === 'background-sync-session-updates') {
    event.waitUntil(syncSessionUpdates());
  }
});

// Push notifications for collaborative features
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      sessionId: data.sessionId,
      type: data.type,
      url: data.url || '/',
    },
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    requireInteraction: true,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.openWindow(url)
  );
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: '1.0.0' });
      break;

    case 'CACHE_DATA':
      cacheOfflineData(data);
      break;

    case 'SYNC_PENDING':
      syncPendingData();
      break;

    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

// Helper functions
function isApiRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint)) ||
         url.hostname.includes('convex') ||
         url.pathname.includes('/api/');
}

function isStaticResource(url) {
  return STATIC_CACHE_URLS.includes(url.pathname) ||
         url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);

  // Try network first for API requests
  try {
    const networkResponse = await fetch(request);

    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache');

    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Data will sync when connection is restored.',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static resource fetch failed');

    // Return offline fallback for HTML
    if (request.headers.get('accept').includes('text/html')) {
      const offlineResponse = await cache.match('/index.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

async function syncChatMessages() {
  console.log('Service Worker: Syncing chat messages');

  try {
    const pendingMessages = await getPendingData('chat-messages');

    for (const message of pendingMessages) {
      await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    }

    await clearPendingData('chat-messages');
    console.log('Service Worker: Chat messages synced');
  } catch (error) {
    console.error('Service Worker: Failed to sync chat messages:', error);
  }
}

async function syncAnnotations() {
  console.log('Service Worker: Syncing annotations');

  try {
    const pendingAnnotations = await getPendingData('annotations');

    for (const annotation of pendingAnnotations) {
      await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation),
      });
    }

    await clearPendingData('annotations');
    console.log('Service Worker: Annotations synced');
  } catch (error) {
    console.error('Service Worker: Failed to sync annotations:', error);
  }
}

async function syncSessionUpdates() {
  console.log('Service Worker: Syncing session updates');

  try {
    const pendingUpdates = await getPendingData('session-updates');

    for (const update of pendingUpdates) {
      await fetch(`/api/sessions/${update.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
    }

    await clearPendingData('session-updates');
    console.log('Service Worker: Session updates synced');
  } catch (error) {
    console.error('Service Worker: Failed to sync session updates:', error);
  }
}

async function getPendingData(type) {
  // In a real implementation, this would use IndexedDB
  const cache = await caches.open('pending-data');
  const response = await cache.match(`pending-${type}`);

  if (response) {
    return response.json();
  }

  return [];
}

async function clearPendingData(type) {
  const cache = await caches.open('pending-data');
  await cache.delete(`pending-${type}`);
}

async function cacheOfflineData(data) {
  const cache = await caches.open('offline-data');
  await cache.put(
    new Request(`offline-${Date.now()}`),
    new Response(JSON.stringify(data))
  );
}

async function syncPendingData() {
  console.log('Service Worker: Syncing all pending data');

  // Sync all types of pending data
  await Promise.all([
    syncChatMessages(),
    syncAnnotations(),
    syncSessionUpdates(),
  ]);

  // Notify clients that sync is complete
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      timestamp: Date.now(),
    });
  });
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.registration.periodicSync.register('data-sync', {
    minInterval: 60 * 1000, // 1 minute
  });
}

// Utility functions for offline detection
self.addEventListener('online', () => {
  console.log('Service Worker: Back online');
  syncPendingData();
});

self.addEventListener('offline', () => {
  console.log('Service Worker: Gone offline');
});