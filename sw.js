// Kendell's Dash service worker (single-file / GitHub Pages friendly).
// Never lets a slow or stalled network hang the launch: page loads race the network against a 3 s timeout and fall
// back to the cached copy; everything else is cache-first. Old caches (including the previous 'kd1') are removed.
const CACHE = 'kd-v2', TIMEOUT = 3000;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.add('./').catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE), cached = await cache.match(req, { ignoreSearch: true }) || await cache.match('./');
      const net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; });
      if (!cached) return net.catch(() => new Response('Offline', { status: 503 }));
      const timer = new Promise(r => setTimeout(() => r(cached), TIMEOUT));
      return Promise.race([net.catch(() => cached), timer]);
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
});
