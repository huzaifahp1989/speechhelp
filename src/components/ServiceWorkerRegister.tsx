'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      let refreshing = false;

      navigator.serviceWorker.register('/sw.js').then((registration) => {
        const reloadIfNeeded = () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', reloadIfNeeded);

        const tryActivateWaiting = () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };

        tryActivateWaiting();

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
              tryActivateWaiting();
            }
          });
        });

        registration.update().catch(() => null);
      });
    }
  }, []);

  return null;
}
