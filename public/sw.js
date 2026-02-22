const CACHE_NAME = 'achariya-ambassador-v1.2'; // Force refresh for action manifest sync
const ASSETS_TO_CACHE = [
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Strategy: Stale-while-revalidate for static assets, network-first for others
    const url = new URL(event.request.url);

    // Skip browser extensions and non-http(s)
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Strategy: Network-First for HTML/Navigation, Stale-while-revalidate for Assets
            const isNavigation = event.request.mode === 'navigate';

            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return cachedResponse;
            });

            // For navigation, try network FIRST, but fallback to cache if offline
            if (isNavigation) {
                return fetchPromise.then(res => res || cachedResponse);
            }

            // For others, return cached immediately if available
            return cachedResponse || fetchPromise;
        })
    );
});
