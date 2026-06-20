'use client';

import { useEffect } from 'react';

/** Keep in sync with CACHE_VERSION in public/sw.js */
const SW_VERSION = '5';
const RELOAD_KEY = 'speechhelp_sw_reloaded';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
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
            if (worker.state !== 'activated' || !navigator.serviceWorker.controller) return;
            if (sessionStorage.getItem(RELOAD_KEY) === SW_VERSION) return;
            sessionStorage.setItem(RELOAD_KEY, SW_VERSION);
            window.location.reload();
          });
        });

        await reg.update();
      } catch {
        /* offline or blocked — ignore */
      }
    };

    register();
  }, []);

  return null;
}
