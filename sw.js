// Family Fighter offline cache: game files are cache-first, the page itself is network-first with an offline fallback.
const C = 'ff-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
const cacheFirst = req => caches.open(C).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
  if (res && (res.ok || res.type === 'opaque') && res.status !== 206) c.put(req, res.clone());
  return res;
})));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // videos use range requests; leave them to the network
  if (u.pathname.endsWith('.mp4') || req.headers.has('range')) return;
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { e.respondWith(cacheFirst(req)); return; }
  if (u.origin !== location.origin) return;
  if (u.pathname.startsWith('/a/')) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('/'))));
});
// drop game files from older versions once the new set is downloaded
self.addEventListener('message', e => {
  if (!e.data || !e.data.keep) return;
  const keep = new Set(e.data.keep.map(x => new URL(x, self.registration.scope).href));
  caches.open(C).then(c => c.keys().then(ks => ks.forEach(k => {
    const u = new URL(k.url);
    if (u.pathname.startsWith('/a/') && !keep.has(k.url)) c.delete(k);
  })));
});
