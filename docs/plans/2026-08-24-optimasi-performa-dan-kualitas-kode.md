# Plan: Optimasi Performa Ekstrem dan Pembersihan Kualitas Kode

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Memastikan aplikasi KasKeluarga memiliki kualitas penulisan kode tingkat tinggi (0 lint error & 0 lint warning), bebas dari re-render berjenjang / efek cascading React 19, serta memiliki performa loading dan runtime yang sangat cepat dengan dynamic code-splitting dan optimasi bundel Next.js.

## Ruang Lingkup
- [x] Refaktor state initialization di `TransactionModal.tsx` agar tidak memicu cascading render / warning React 19.
- [x] Bersihkan semua unused imports dan gantikan tipe `any` dengan interface / unknown bertipe ketat di `CashflowChart.tsx`, `CategoryChart.tsx`, `SettingsView.tsx`, `ReportsView.tsx`, `TransactionList.tsx`, `auth.ts`, dan `db.ts`.
- [x] Optimasi dynamic code splitting di `src/app/page.tsx` untuk tab sekunder (`BudgetView`, `BillsView`, `WalletsView`, `SettingsView`, `TransactionModal`) agar First Load JS dashboard sangat ringan.
- [x] Optimasi `next.config.mjs` dengan penghapusan `console.log` di mode produksi (`compiler.removeConsole`).
- [x] Verifikasi hasil: `npm run lint` menghasilkan 0 error dan 0 warning, `npm test` lulus, `npm run build` optimal.

## File yang Disentuh
- `docs/plans/2026-08-24-optimasi-performa-dan-kualitas-kode.md` (baru)
- `src/components/transactions/TransactionModal.tsx`
- `src/components/reports/CashflowChart.tsx`
- `src/components/reports/CategoryChart.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/settings/SettingsView.tsx`
- `src/components/transactions/TransactionList.tsx`
- `src/lib/auth.ts`
- `src/lib/db.ts`
- `src/app/page.tsx`
- `next.config.mjs`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. `npm run lint` selesai dengan 0 error dan 0 warning.
2. `npm test` lulus seluruh pengujian (51+ assertions).
3. `npm run build` sukses tanpa error TypeScript.
4. Perubahan dicatat di `changelog.md`.
