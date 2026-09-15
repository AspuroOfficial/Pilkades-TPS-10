/**
 * ======================================================================
 * SERVICE WORKER — Checkin Pemilih TPS 10 Kobak Sumur
 * ======================================================================
 * Tujuan file ini HANYA supaya Chrome mendeteksi halaman sebagai PWA
 * yang bisa "Diinstal", dan supaya app shell (HTML/CSS/JS/ikon) tetap
 * bisa dibuka walau koneksi sedang lemah.
 *
 * PENTING: data pemilih, login, dan suara SELALU diambil langsung dari
 * internet (Google Apps Script) dan TIDAK PERNAH disimpan di cache,
 * supaya data yang tampil selalu yang terbaru dan tidak basi.
 *
 * Kalau kamu mengubah index.html, naikkan angka CACHE_VERSION di bawah
 * supaya pengguna lama otomatis mendapat versi terbaru.
 * ======================================================================
 */

const CACHE_VERSION = 'tps10-kobaksumur-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Domain yang TIDAK BOLEH pernah di-cache (data live: Apps Script & Google API lain)
const NEVER_CACHE_HOSTS = [
  'script.google.com',
  'script.googleusercontent.com',
  'googleusercontent.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isNeverCache(url) {
  try {
    const host = new URL(url).host;
    return NEVER_CACHE_HOSTS.some((h) => host.indexOf(h) !== -1);
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET; biarkan POST (checkin/login/saveSuara dll) langsung ke jaringan.
  if (req.method !== 'GET') return;

  // Data live ke Apps Script: selalu network, jangan pernah dari cache.
  if (isNeverCache(req.url)) {
    event.respondWith(
      fetch(req).catch(() => new Response(
        JSON.stringify({ ok: false, error: 'Tidak ada koneksi internet.' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // App shell: stale-while-revalidate supaya cepat dibuka & tetap update sendiri.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok && req.url.startsWith(self.location.origin)) {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
