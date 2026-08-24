'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Export, PlusSquare, X } from '@phosphor-icons/react';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  if (typeof window === 'undefined') return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true;
  const dismissed = localStorage.getItem('ios_install_prompt_dismissed');
  return Boolean(isIos && !isStandalone && !dismissed);
}

function getServerSnapshot() {
  return false;
}

export function IosInstallPrompt() {
  const isEligible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissedLocal, setDismissedLocal] = useState(false);

  if (!isEligible || dismissedLocal) return null;

  const handleDismiss = () => {
    localStorage.setItem('ios_install_prompt_dismissed', 'true');
    setDismissedLocal(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-surface border border-border p-4 rounded-2xl shadow-xl animate-slide-up md:hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1 pr-2">
          <p className="text-xs font-bold text-text">Pasang KasKeluarga di iPhone Anda</p>
          <p className="text-xs text-text-muted leading-relaxed">
            Ketuk tombol <Export size={14} className="inline mx-1 text-primary" weight="bold" /> di bar bawah Safari, lalu pilih{' '}
            <span className="font-semibold text-text">
              <PlusSquare size={14} className="inline mr-0.5" /> Tambah ke Layar Utama
            </span>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup panduan pemasangan"
          className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-text-muted hover:text-text"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
