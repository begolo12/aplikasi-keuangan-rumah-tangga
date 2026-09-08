// Service worker KasKeluarga: network-first untuk navigasi (data selalu segar),
// cache-first hanya untuk aset statis immutable. API /api/ TIDAK pernah dicache.

const CACHE_NAME = 'kaskeluarga-static-v4';
const PRECACHE_URLS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // data finansial selalu dari jaringan

  // Navigasi halaman: network-first, fallback ke halaman offline saat tidak ada jaringan.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html').then((cached) => cached || Response.error()))
    );
    return;
  }

  // Aset statis: cache-first (URL berisi hash konten sehingga aman).
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});

// Reminder proaktif: aplikasi mengirim daftar tagihan mendesak & anggaran
// hampir habis sekali sehari; SW yang menampilkan notifikasinya.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'KAS_REMINDERS') return;

  const notifications = [];
  for (const bill of (data.bills || []).slice(0, 2)) {
    notifications.push({
      title: `Tagihan: ${bill.title}`,
      body: `${bill.due_label} \u00b7 ${bill.amount_label}`,
      tag: `kas-bill-${bill.id}`,
    });
  }
  for (const budget of (data.budgets || []).slice(0, 2)) {
    notifications.push({
      title: `Anggaran ${budget.name} hampir habis`,
      body: `Terpakai ${budget.percentage_label} dari limit bulan ini.`,
      tag: `kas-budget-${budget.id}`,
    });
  }

  event.waitUntil(
    Promise.allSettled(
      notifications.map((n) =>
        self.registration.showNotification(n.title, {
          body: n.body,
          tag: n.tag,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: '/' },
        })
      )
    )
  );
});

// Web Push: pesan dari server (cron harian tagihan H-0/H-1).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // payload non-JSON: tampilkan notifikasi generik
  }
  const title = data.title || 'KasKeluarga';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || 'kas-push',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/');
      })
  );
});
