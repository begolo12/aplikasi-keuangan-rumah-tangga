'use client';

import Link from 'next/link';
import { Compass } from '@phosphor-icons/react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Compass size={28} weight="duotone" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-bold text-text">Halaman Tidak Ditemukan</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-fg text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
