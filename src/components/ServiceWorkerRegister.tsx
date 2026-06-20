'use client';

import { useEffect } from 'react';

/** Keep in sync with CACHE_VERSION in public/sw.js */
const SW_VERSION = '5';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:') return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`, {
          updateViaCache: 'none',
        });

        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });

        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        await reg.update();
      } catch {
        /* offline or blocked — ignore */
      }
    };

    register();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return null;
}
