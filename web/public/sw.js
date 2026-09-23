const CACHE_NAME = 'dai-web-v6-20260924';
const CORE = ['./', './dai-logo.svg', './auth-config.js', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

async function networkFirst(request, fallbackKey) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then(cache => cache.put(fallbackKey || request, copy));
    }
    return response;
  } catch {
    return (await caches.match(fallbackKey || request)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './'));
    return;
  }

  const destination = request.destination;
  const dynamicAsset =
    destination === 'script' ||
    destination === 'style' ||
    destination === 'worker' ||
    destination === 'document' ||
    /\.(?:js|mjs|css|html)(?:$|\?)/i.test(url.pathname + url.search);

  if (dynamicAsset) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => Response.error());
    })
  );
});
