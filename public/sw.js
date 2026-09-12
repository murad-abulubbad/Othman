// Service Worker for Othman For Gaming PWA
const CACHE_NAME    = 'othman-gaming-v6-imgcache';
const IMG_CACHE     = 'othman-gaming-img-v1';
const IMG_CACHE_MAX = 400;

// Product photos live on Firebase Storage. Their URLs carry a
// ?alt=media&token=... query string and never end in a file extension,
// so the static-asset test below can't recognise them — they need
// their own check, and it has to run before the Firebase bail-out.
const isStorageImage = (url) =>
  url.startsWith('https://firebasestorage.googleapis.com/') ||
  /^https:\/\/[a-z0-9-]+\.firebasestorage\.app\//.test(url);

// Local static assets — test the path only, so a cache-busting query
// string doesn't disqualify an otherwise cacheable file.
const isStaticAsset = (url) =>
  /\.(png|jpg|jpeg|webp|gif|ico|svg|woff2?|ttf)$/i.test(url.split('?')[0]);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== IMG_CACHE)
          .map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Product images: cache-first, and permanently. The admin panel
  // prefixes every upload with Date.now(), so replacing an image
  // always produces a new URL — a cached entry can never go stale.
  if (isStorageImage(url)) {
    event.respondWith(cacheFirst(event.request, IMG_CACHE));
    return;
  }

  // Firestore, Auth and the SDK itself must always hit the network.
  if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic') ||
      /\.(html|js|css)(\?|$)/.test(url)) {
    return; // browser default — no SW involvement
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
  }
});

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);

  // An <img> to another origin yields an opaque response: status 0 and
  // ok === false even on success. Opaque responses are still cacheable,
  // and skipping them here would defeat the whole image cache.
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    if (cacheName === IMG_CACHE) trimCache(cacheName, IMG_CACHE_MAX);
  }
  return response;
}

// Keep the image cache from growing without bound. cache.keys()
// returns insertion order, so the oldest entries go first.
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}
