// Minimal Ludo service worker — basic offline shell + network-first for everything else.
// We don't pre-cache assets aggressively because Next.js fingerprints filenames; instead
// we cache responses as they're fetched and serve them from cache when offline.

const CACHE = 'ludo-v1';
const SHELL = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Skip cross-origin requests (e.g., the WebSocket server)
  if (new URL(req.url).origin !== self.location.origin) return;
  // Skip WebSocket upgrades
  if (req.headers.get('upgrade') === 'websocket') return;
  // Network-first; fall back to cache
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('/')))
  );
});
