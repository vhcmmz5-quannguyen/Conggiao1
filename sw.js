function isOldAppCache(name) {
  return name === 'app-quantri-v17-beta' || name === 'app-quantri-v9-pwa-icons';
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.allSettled(keys.filter(isOldAppCache).map(name => caches.delete(name)));
      await self.clients.claim();
      const clientsList = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(clientsList.map(client => client.navigate(client.url)));
    } finally {
      await self.registration.unregister();
    }
  })());
});
