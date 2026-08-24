'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Warning, ArrowClockwise, House } from '@phosphor-icons/react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[KasKeluarga] Unhandled UI error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-surface border border-border rounded-3xl shadow-2xs">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-expense/10 text-expense flex items-center justify-center">
          <Warning size={28} weight="duotone" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-bold text-text">Terjadi Kesalahan Tak Terduga</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Aplikasi gagal menampilkan halaman ini. Data Anda tetap aman di server.
            Coba muat ulang, atau kembali ke beranda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-fg text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <ArrowClockwise size={16} weight="bold" />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-xl border border-border bg-background text-text text-sm font-bold hover:bg-surface-2 active:opacity-80 transition-colors"
          >
            <House size={16} weight="bold" />
            Ke Beranda
          </Link>
        </div>
        {error.digest && (
          <p className="text-[10px] text-text-muted/60 font-mono">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
