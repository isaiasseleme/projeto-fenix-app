const cacheName = 'fenix-shell-v4';
const shell = ['./', './index.html', './app.js', './plan.js', './api.js', './config.js', './style.css', './manifest.webmanifest', './fenix.png', './fenix-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fenix-shell-') && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await caches.match(event.request);
    return cached || (event.request.mode === 'navigate' ? await caches.match('./') : Response.error());
  }));
});
