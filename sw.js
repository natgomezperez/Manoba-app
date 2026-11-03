// Caches the app and KaTeX so it works offline after first load
const CACHE = 'manoba-v2';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      if (sameOrigin) {
        // network first: always get the latest app, fall back to cache offline
        try {
          const res = await fetch(e.request);
          if (res && res.status === 200) cache.put(e.request, res.clone());
          return res;
        } catch (err) { return (await cache.match(e.request)) || Response.error(); }
      }
      // CDN assets (KaTeX): cache first
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res && (res.status === 200 || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      } catch (err) { return Response.error(); }
    })
  );
});
