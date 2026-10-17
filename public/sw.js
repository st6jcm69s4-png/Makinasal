const CACHE = 'makinasal-shell-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html','/icons/icon-192.png','/icons/icon-512.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('makinasal-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Never cache sessions, profiles, messages, API calls or listing responses.
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET' && event.request.mode === 'navigate' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
