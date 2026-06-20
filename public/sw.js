/** Bump version when deploying — forces cache purge on all clients. */
const CACHE_VERSION = '5';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

/** Do not cache HTML or /_next/ assets — always fetch fresh from Vercel. */
