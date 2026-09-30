/* Sentinel service worker — app-shell caching for offline use.
 *
 * Strategy:
 *  - precache the app shell (HTML, JS, CSS bundles) on install
 *  - for navigation requests: network-first, fall back to cache when offline
 *  - for static assets (_next/static, images): cache-first
 *  - for API requests: network-only (do NOT cache — they must be live)
 */

const CACHE = 'sentinel-shell-v1';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache API calls — they must always be live.
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network-first, fallback to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets: cache-first.
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icon') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }),
      ),
    );
  }
});
