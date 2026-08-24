'use client';

import { useEffect } from 'react';

/**
 * Registrasi service worker PWA.
 * Dipasang sekali di root layout; strategi cache ada di public/sw.js
 * (network-first navigasi, cache-first hanya aset statis, API tidak pernah dicache).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Kegagalan registrasi tidak boleh mengganggu aplikasi.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
