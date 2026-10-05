// Rise service worker: works offline and shows push notifications
const CACHE = 'rise-v21';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'praycalc.js', 'morphdom.js', 'azkar-data.js', 'audio.js', 'manifest.webmanifest',
  'assets/icon-192.png', 'assets/dragon-icon.png', 'assets/header-day.webp', 'assets/header-night.webp',
  'assets/prayer-day.webp', 'assets/prayer-night.webp', 'assets/prayer-screen.webp', 'assets/score.webp',
  'assets/cd-green.webp', 'assets/cd-sand.webp', 'assets/cd-blue.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CACHE + '-ext').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    if (/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host)) e.respondWith(caches.open(CACHE + '-ext').then(c => c.match(e.request).then(hit => { const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit); return hit || net; })));
    return;
  }
  const isAsset = url.pathname.includes('/assets/');
  if (isAsset) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
  } else {
    e.respondWith(fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Rise', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Rise', {
    body: d.body || '', icon: 'assets/icon-192.png', badge: 'assets/icon-192.png',
    tag: d.tag || undefined, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
