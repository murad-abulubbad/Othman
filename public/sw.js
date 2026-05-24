// Service Worker for Othman For Gaming PWA
const CACHE_NAME = 'othman-gaming-v5-mobileperf';

// Only cache static assets (images, fonts, icons) — never HTML/JS/CSS
const CACHEABLE = (url) => {
  return /\.(png|jpg|jpeg|webp|gif|ico|svg|woff2?|ttf)$/i.test(url) &&
    !url.includes('firebase') &&
    !url.includes('googleapis') &&
    !url.includes('gstatic') &&
    !url.includes('cloudinary');
};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Always go to network for HTML, JS, CSS, Firebase, APIs
  if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic') ||
      url.includes('cloudinary') || /\.(html|js|css)(\?|$)/.test(url)) {
    return; // browser default — no SW involvement
  }

  // Cache-first for static assets (images/fonts)
  if (CACHEABLE(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
