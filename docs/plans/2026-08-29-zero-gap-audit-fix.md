# Plan: Zero-Gap Audit & Hardening Codebase

- Tanggal: 2026-08-29
- Status: done

## Tujuan
Menutup seluruh GAP dan temuan audit dari hasil pengujian menyeluruh:
1. Menghilangkan 100% ESLint warnings (unused vars & setState di useEffect).
2. Memperkuat validasi parameter ID (UUID) di handler `src/app/api/assets/[id]/route.ts` sebelum query database.
3. Menambahkan penguatan pertahanan (*defense-in-depth*) filter multi-user pada subquery kalkulasi kontribusi goals di `src/app/api/goals/[id]/contribute/route.ts`.
4. Memastikan build, lint, unit test (119 test), dan E2E test (52 test) berjalan 100% bersih tanpa warning dan tanpa error.

## Ruang Lingkup
- [x] Validasi explicit UUID pada `src/app/api/assets/[id]/route.ts` (GET, PUT, DELETE).
- [x] Penguatan filter user_id pada `src/app/api/goals/[id]/contribute/route.ts`.
- [x] Pembersihan unused variables di `src/components/assets/AssetModal.tsx`, `src/components/assets/AssetsView.tsx`, `src/components/reports/FinancialRatiosReport.tsx`, `src/components/reports/IncomeStatementReport.tsx`.
- [x] Refactor setState sinkronus dalam useEffect menjadi pola inisialisasi state murni atau event-driven di `src/app/page.tsx`, `src/components/layout/SidebarNav.tsx`, `src/components/settings/SettingsView.tsx`, `src/components/reports/ReportsView.tsx`, `src/components/wallets/ReconcileModal.tsx`, `src/components/assets/AssetScheduleModal.tsx`, `src/components/assets/SellAssetModal.tsx`, `src/components/goals/GoalsView.tsx`.
- [x] Verifikasi audit ulang `npm run lint`, `npm run build`, `npm test` sampai 0 errors dan 0 warnings.

## File yang Disentuh
- `src/app/api/assets/[id]/route.ts`
- `src/app/api/goals/[id]/contribute/route.ts`
- `src/components/assets/AssetModal.tsx`
- `src/components/assets/AssetsView.tsx`
- `src/components/reports/FinancialRatiosReport.tsx`
- `src/components/reports/IncomeStatementReport.tsx`
- `src/app/page.tsx`
- `src/components/layout/SidebarNav.tsx`
- `src/components/settings/SettingsView.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/wallets/ReconcileModal.tsx`
- `src/components/assets/AssetScheduleModal.tsx`
- `src/components/assets/SellAssetModal.tsx`
- `src/components/goals/GoalsView.tsx`
- `src/components/calendar/CalendarView.tsx`

## Kriteria Selesai (Definition of Done)
1. `npm run lint` menghasilkan 0 error dan 0 warning.
2. `npm run build` sukses 100% tanpa error TypeScript.
3. `npm test` (`test:audit` + `test:e2e`) seluruh 171 test lulus 100%.
4. Dokumentasi changelog dan status plan diperbarui.
