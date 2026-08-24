# Plan: Fitur Hutang-Piutang, Navigasi Back Mobile, dan Laporan Cashflow Komprehensif

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Mengimplementasikan modul pencatatan dan pelunasan Hutang & Piutang, sistem navigasi mobile back button dengan proteksi keluar aplikasi, serta kalkulasi metrik likuiditas nyata (*Safe-to-Spend / Dana Bebas Belanja*) yang terhubung otomatis ke laporan keuangan dan arus kas bulanan.

## Ruang Lingkup
- [x] Buat tabel database `debts` dan `debt_payments` di `src/app/api/init/route.ts`.
- [x] Buat Zod schemas untuk Hutang-Piutang di `src/lib/validations.ts` dan tipe TypeScript di `src/lib/types.ts`.
- [x] Buat route handler API untuk Hutang-Piutang:
  - `GET /api/debts`, `POST /api/debts`, `GET /api/debts/[id]`, `PUT /api/debts/[id]`, `DELETE /api/debts/[id]`
  - `POST /api/debts/[id]/pay` (dengan transaksi atomik, mutasi saldo dompet, dan pencatatan transaksi otomatis).
- [x] Integrasikan kalkulasi Hutang-Piutang dan *Safe-to-Spend* pada `GET /api/dashboard/bootstrap` dan `GET /api/reports/monthly`.
- [x] Buat komponen UI Hutang & Piutang:
  - `src/components/debts/DebtsView.tsx` (manajemen tab Hutang vs Piutang, modal tambah, modal bayar/cicil).
  - `src/components/debts/DebtItem.tsx` (kartu hutang/piutang, progress bar pelunasan, badge jatuh tempo).
- [x] Perbarui `BalanceHeader.tsx` untuk menampilkan widget "Dana Bebas Belanja" (Safe-to-Spend) dan badge likuiditas.
- [x] Perbarui `QuickActions.tsx`, `BottomNav.tsx`, dan `SidebarNav.tsx` untuk menyertakan navigasi ke modul Hutang-Piutang.
- [x] Perbarui `ReportsView.tsx` untuk menampilkan ringkasan arus kas riil komprehensif.
- [x] Implementasikan sistem navigasi Mobile Back & Proteksi Keluar di `src/app/page.tsx` dan `src/components/layout/AppShell.tsx`.
- [x] Perluas unit test di `scripts/audit-self-test.ts` untuk memverifikasi skema dan kalkulasi baru (57 passed).
- [x] Verifikasi: `npm test` lulus, `npm run lint` 0 warning, `npm run build` sukses.
- [x] Catat hasil ke `changelog.md`.

## File yang Disentuh
- `docs/plans/2026-08-24-fitur-hutang-piutang-navigasi-back-laporan-cashflow.md`
- `src/lib/types.ts`
- `src/lib/schemas.ts`
- `src/lib/initDb.ts`
- `src/app/api/init/route.ts`
- `src/app/api/debts/route.ts` (baru)
- `src/app/api/debts/[id]/route.ts` (baru)
- `src/app/api/debts/[id]/pay/route.ts` (baru)
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/api/reports/monthly/route.ts`
- `src/lib/apiFetch.ts`
- `src/components/debts/DebtsView.tsx` (baru)
- `src/components/debts/DebtItem.tsx` (baru)
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/SidebarNav.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/app/page.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. User dapat mencatat hutang dan piutang, mencatat cicilan/pelunasan bertahap, dan saldo dompet kas otomatis termutasi secara sinkron.
2. Laporan dan header dashboard menampilkan perhitungan "Dana Bebas Belanja" (*Safe-to-Spend*) secara akurat.
3. Tombol back mobile kembali ke menu sebelumnya dan meminta konfirmasi jika berada di beranda sebelum keluar aplikasi.
4. `npm test` lulus, `npm run lint` 0 error/warning, `npm run build` sukses tanpa kendala.
