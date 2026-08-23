'use client';

import React, { useState, useEffect } from 'react';
import { Export, PlusSquare, X } from '@phosphor-icons/react';

export function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect if running on iOS Safari and not already in standalone standalone mode
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const dismissed = localStorage.getItem('ios_install_prompt_dismissed');

    if (isIos && !isStandalone && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ios_install_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

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
        <button onClick={handleDismiss} className="text-text-muted hover:text-text p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
