// Service Worker for Push Notifications
const CACHE_NAME = 'fundraising-v1';
const urlsToCache = [
  '/',
  '/offline.html'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  const payload = event.data.json();
  const { title, body, icon, badge, data, actions } = payload;

  const options = {
    body,
    icon: icon || '/icon-192x192.png',
    badge: badge || '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data || {},
    actions: actions || [],
    requireInteraction: data?.urgent || false,
    tag: data?.tag || 'default',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  // Determine URL based on notification type
  switch (data.type) {
    case 'donation':
      url = `/campaigns/${data.campaign_id}#donation-${data.donation_id}`;
      break;
    case 'update':
      url = `/campaigns/${data.campaign_id}#update-${data.update_id}`;
      break;
    case 'goal_reached':
    case 'campaign_ending':
      url = `/campaigns/${data.campaign_id}`;
      break;
    case 'trust_change':
      url = '/profile#trust-score';
      break;
    default:
      url = '/notifications';
  }

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'donate':
        url = `/campaigns/${data.campaign_id}#donate`;
        break;
      case 'view':
        // URL already set above
        break;
      case 'dismiss':
        return; // Just close the notification
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if any client is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(url);
          }
        }
        // If no client is open, open a new window
        return clients.openWindow(url);
      })
  );
});

// Background sync for offline notifications
self.addEventListener('sync', event => {
  if (event.tag === 'send-notifications') {
    event.waitUntil(sendQueuedNotifications());
  }
});

// Function to send queued notifications when back online
async function sendQueuedNotifications() {
  try {
    const cache = await caches.open('notification-queue');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Failed to send queued notification:', error);
      }
    }
  } catch (error) {
    console.error('Failed to process notification queue:', error);
  }
}

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});

// Message event - handle messages from the main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
