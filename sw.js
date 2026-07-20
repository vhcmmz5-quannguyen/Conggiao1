// ĐÃ VÁ: Chỉ cache GET, chỉ cache response.ok, có fallback offline
const CACHE_NAME = 'app-quantri-v7-beta';
const urlsToCache = ['./index.html', './style.css', './script.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); }))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // VÁ: Bỏ qua non-GET (Cache API không hỗ trợ POST/PUT...)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // VÁ: Chỉ cache nếu response hợp lệ (200-299, same-origin/CDN chuẩn)
        if (response && response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
            .catch(err => console.warn('[SW] cache.put lỗi:', err));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached =>
        cached || new Response('Bạn đang offline. Vui lòng kết nối lại.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
      ))
  );
});

self.addEventListener('push', event => {
  const data = event.data
    ? event.data.json()
    : { title: 'LỚP HỌC CÔNG GIÁO', body: 'Bạn có thông báo mới!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const scope = self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // VÁ: So khớp linh hoạt theo scope thay vì '/' cứng
      for (const client of windowClients) {
        if (client.url.startsWith(scope) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(scope);
    })
  );
});
