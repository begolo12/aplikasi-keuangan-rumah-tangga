# Plan: Desain Kompak Mobile & Efisiensi Layar Minimal Scroll

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Mengompresi visual seluruh layar aplikasi pada smartphone agar padat, ringkas (*compact*), dan tidak memakan terlalu banyak ruang scroll ke bawah, sehingga data keuangan utama dapat dilihat dalam satu pandangan (*glanceable*).

## Akar Masalah (Root Cause)
1. Padding container (`p-4` s/d `p-8`), margin antar seksi (`space-y-6`), dan ukuran kartu visual terlalu besar untuk layar ponsel.
2. Kartu ringkasan likuiditas di laporan keuangan sebelumnya memakan 4 baris vertikal penuh.
3. Tombol aksi cepat dan kartu dompet mengambil tinggi vertikal yang signifikan.

## Ruang Lingkup Perbaikan
- [x] Restrukturisasi kartu ringkasan likuiditas pada [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx) menjadi grid 2x2 kompak (`grid-cols-2 lg:grid-cols-4 gap-2`) dengan padding `p-2 sm:p-2.5` dan tipografi proporsional.
- [x] Kompresi header saldo [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx) (padding `p-3.5 sm:p-5`, font saldo `text-xl sm:text-2xl md:text-3xl`, strip safe-to-spend `p-2.5 sm:p-3`).
- [x] Kompresi tombol aksi cepat [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx) (icon size 18, container `w-9 h-9`, gap 1 sm:gap-2, padding `p-2.5 sm:p-3.5`).
- [x] Kompresi kartu arus kas [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx) (padding `p-2.5 sm:p-3`, icon 17, text `text-sm sm:text-base`).
- [x] Kompresi kartu pos kas [WalletScroller.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/WalletScroller.tsx) (lebar snap `w-[190px]`, icon 17, padding `p-3`).
- [x] Kompresi padding container utama di [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) (`p-2.5 sm:p-4`) dan jarak seksi [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) (`space-y-3.5 sm:space-y-5`).
- [x] Verifikasi: `npm test` (87/87 passed), `npm run lint` (0 warning), `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-desain-kompak-mobile-minimal-scroll.md`
- `src/components/reports/ReportsView.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/dashboard/MonthlySummary.tsx`
- `src/components/dashboard/WalletScroller.tsx`
- `src/components/layout/AppShell.tsx`
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Tampilan aplikasi di smartphone tampak padat, rapi, dan tidak memerlukan banyak scroll.
2. Informasi penting (saldo, dana bebas belanja, aksi cepat, pos kas, arus kas) muat dalam viewport smartphone.
3. Seluruh unit test dan E2E test lulus 100%.
