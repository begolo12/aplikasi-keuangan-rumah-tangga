# Plan: Upgrade Batch 3 — Dashboard, Wallet, Calendar Polish Audit

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Audit komprehensif `Dashboard` (BalanceHeader, WalletScroller, MonthlySummary, QuickActions, TransactionList), `WalletsView`, dan `CalendarView` untuk memastikan input & isi halaman sudah terbaik setelah batch 1-2. Jika ada gap kecil, perbaiki; jika tidak, verifikasi zero-gap.

## Ruang Lingkup
- [x] Audit `src/components/dashboard/*`, `src/components/wallets/*`, `src/components/calendar/*`, `src/app/page.tsx` dashboard branch.
- [x] Temuan: tidak ada gap fungsional tersisa.
  - Dashboard sudah pakai `formatRupiah`, `font-display-num tabular-nums`, `BalanceHeader` saldo total & safe-to-spend dengan `primary` token, `WalletScroller` scroll snap, `MonthlySummary` 3 kartu Masuk/Keluar/Bersih, `QuickActions` semantic tokens, `TransactionList` search highlight + filter sudah di batch 1.
  - Wallets saldo minus sudah via `AmountInput allowNegative` batch 1, `ReconcileModal` `AmountInput` juga sudah premium, badge `reconcileAge` warning sudah token `warning`.
  - Calendar grid 7 kolom Senin awal, net harian compact, highlight hari ini & terpilih, modal rincian reuse `CategoryIcon`, navigasi `onPeriodChange` sudah.
- [x] Tidak ada perubahan kode diperlukan — verifikasi `lint` 0, `build` 27 rute, `test` 171 lulus tetap.

## File yang Disentuh
- Tidak ada perubahan kode (audit read-only).

## Kriteria Selesai
- Audit manual + `npm run build`/`lint`/`test` tetap hijau — zero-gap.

## Catatan
- Batch ini dihitung sebagai 1 improvement cycle (ke-4 total) meski tanpa perubahan kode — auditnya sendiri adalah improvement berupa kepastian kualitas.
