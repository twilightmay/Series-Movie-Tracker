// Service worker: precache the app shell, then serve same-origin requests
// stale-while-revalidate so the app works offline but still picks up updates.
// A new worker does NOT take over silently — it waits until the page tells it
// to (SKIP_WAITING), so the app can show an "Update available — reload" prompt.
const CACHE = 'smtracker-v3';
const PRECACHE = [
    './',
    './index.html',
    './landing.html',
    './styles.css',
    './app.js',
    './favicon.png',
    './icon-192.png',
    './manifest.json',
    './marketplace.html',
    './marketplace-data.json'
];

self.addEventListener('install', event => {
    // Note: no skipWaiting() here — the new worker waits until the page asks.
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// The page posts this once the user accepts the update prompt.
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // let CDN images/APIs pass through

    event.respondWith(
        caches.open(CACHE).then(cache =>
            cache.match(req).then(cached => {
                const fetched = fetch(req)
                    .then(response => {
                        if (response && response.ok) cache.put(req, response.clone());
                        return response;
                    })
                    .catch(() => cached);
                return cached || fetched;
            })
        )
    );
});
