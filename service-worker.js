// Service worker de l'application "Check-list de voyage"
// - Met en cache l'app shell (HTML/CSS/JS/icônes) pour un fonctionnement hors-ligne.
// - Laisse passer sans intervention toutes les requêtes vers Firebase / gstatic
//   (autre origine), afin de ne jamais interférer avec la synchronisation.

const CACHE_NAME = 'checklist-voyage-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne jamais intercepter les requêtes vers d'autres origines
  // (Firebase, Firestore, gstatic.com, etc.) : elles doivent toujours
  // aller au réseau pour que la synchronisation fonctionne normalement.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Stale-while-revalidate : sert le cache immédiatement si dispo,
      // met à jour le cache en arrière-plan.
      return cached || networkFetch;
    })
  );
});
