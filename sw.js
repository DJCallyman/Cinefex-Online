/**
 * Cinefex Archives - Service Worker
 * Cache-first strategy for static assets (fonts, covers, articles)
 */

const CACHE_NAME = 'cinefex-v1';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/fonts.css',
    '/css/tailwind.css',
    '/js/app.js',
    '/js/archive.js',
    '/js/modal.js',
    '/js/viewer.js',
    '/js/config.js',
    '/issues_full.json',
];

// Install: precache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name)),
            ),
        ),
    );
    self.clients.claim();
});

// Fetch: cache-first for fonts and covers, network-first for HTML/JSON
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Cache-first for fonts
    if (url.pathname.startsWith('/fonts/')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Cache-first for cover images
    if (url.pathname.startsWith('/covers/')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Cache-first for issue article HTML
    if (url.pathname.startsWith('/issues/')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Network-first for everything else (HTML, JSON, JS, CSS)
    event.respondWith(networkFirst(event.request));
});

/**
 * Cache-first strategy: serve from cache, fall back to network and cache the response.
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (_err) {
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy: try network, fall back to cache.
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (_err) {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}
