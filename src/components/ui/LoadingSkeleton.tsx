import React from 'react';

export function CardSkeleton() {
  return (
    <div className="p-5 bg-surface border border-border rounded-2xl animate-pulse space-y-3">
      <div className="h-4 bg-surface-2 rounded-md w-1/3" />
      <div className="h-7 bg-surface-2 rounded-lg w-2/3" />
      <div className="h-3 bg-surface-2 rounded-md w-1/2" />
    </div>
  );
}

export function TransactionItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 w-2/3">
        <div className="w-10 h-10 bg-surface-2 rounded-xl shrink-0" />
        <div className="space-y-1.5 w-full">
          <div className="h-4 bg-surface-2 rounded w-3/4" />
          <div className="h-3 bg-surface-2 rounded w-1/2" />
        </div>
      </div>
      <div className="h-5 bg-surface-2 rounded w-1/4" />
    </div>
  );
}

/**
 * Kerangka pemuatan dashboard.
 *
 * Susunannya sengaja mengikuti urutan sebenarnya di `src/app/page.tsx`
 * (hero saldo -> tombol aksi -> daftar transaksi -> dompet -> ringkasan bulanan)
 * supaya tidak ada lompatan tata letak saat data selesai dimuat. Skeleton yang
 * bentuknya berbeda dari konten nyata justru membuat halaman terasa berkedip.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-3.5 sm:space-y-5 animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat data keuangan…</span>

      {/* 1. Kartu saldo total (hero) */}
      <div className="rounded-2xl sm:rounded-3xl bg-surface border border-border p-4 sm:p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-3.5 bg-surface-2 rounded w-32" />
          <div className="h-9 bg-surface-2 rounded-lg w-56" />
          <div className="h-3.5 bg-surface-2 rounded w-44" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="h-14 bg-surface-2 rounded-2xl" />
          <div className="h-14 bg-surface-2 rounded-2xl" />
        </div>
      </div>

      {/* 2. Tombol aksi cepat: 2 kolom di HP, 4 di layar lebar */}
      <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 bg-surface-2 rounded-xl" />
          ))}
        </div>
      </div>

      {/* 3. Daftar transaksi terbaru */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl space-y-3">
        <div className="h-4 bg-surface-2 rounded w-36" />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
      </div>

      {/* 4. Deretan kartu dompet */}
      <div className="space-y-2">
        <div className="h-4 bg-surface-2 rounded w-28" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-40 shrink-0 bg-surface border border-border rounded-2xl" />
          ))}
        </div>
      </div>

      {/* 5. Ringkasan arus kas bulan ini */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl space-y-3">
        <div className="h-4 bg-surface-2 rounded w-40" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-2 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
