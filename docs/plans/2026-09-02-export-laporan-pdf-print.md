# Plan: Export Laporan PDF via Print Stylesheet

- Tanggal: 2026-09-02
- Status: cancelled

> Catatan: fitur cetak/Simpan PDF ternyata sudah tersedia (print stylesheet di `globals.css`
> + tombol `window.print()` di `ReportsView`). Plan dibatalkan tanpa eksekusi.

## Tujuan
Laporan keuangan (neraca, laba rugi, cashflow, rasio) kini bisa dicetak/disimpan PDF
langsung dari browser memakai dialog print native — tanpa dependensi baru.

## Ruang Lingkup
- [ ] `@media print` di `globals.css`: latar putih, tanpa bayangan, kartu tidak terpotong halaman
- [ ] Sembunyikan chrome aplikasi saat cetak via `print:hidden` (SidebarNav, BottomNav, TopHeader, OfflineBanner, IosInstallPrompt, exit toast, padding bottom mobile)
- [ ] Tombol "Cetak / Simpan PDF" (`window.print()`) di `ReportsView`

## File yang Disentuh
- `src/app/globals.css`
- `src/components/layout/AppShell.tsx`, `SidebarNav.tsx` (atau pembungkusnya), `BottomNav.tsx`, `TopHeader.tsx`
- `src/components/reports/ReportsView.tsx`

## Kriteria Selesai (Definition of Done)
- `npm run build` lulus; tombol muncul di Laporan dan hasil print hanya berisi konten laporan.
