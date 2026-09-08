# Plan: Stabilisasi, Perbaikan Build, Validasi Test, dan Integrasi SaaS Landing Page

- Tanggal: 2026-09-08
- Status: done

## Tujuan
Memperbaiki seluruh error sintaks dan kompilasi TypeScript/PostCSS, menutup 4 kegagalan pada test audit (`scripts/audit-self-test.ts`), menyelesaikan konflik rute Next.js App Router antara landing page SaaS publik dan dashboard authenticated, serta memastikan build produksi `npm run build` dan seluruh test `npm run test:audit` (151/151) lulus 100%.

## Ruang Lingkup
- [x] Perbaikan sintaks CSS di `src/app/globals.css`.
- [x] Pemulihan kode bersih `src/components/layout/SidebarNav.tsx` dengan dukungan badge counter (`pendingBillsCount`, `overbudgetCount`, `unpaidDebtsCount`) dan item navigasi yang valid.
- [x] Perbaikan typo potongan teks di `src/components/goals/GoalsView.tsx`.
- [x] Perbaikan unclosed parenthesis `apiFetch` di `src/components/settings/SettingsView.tsx`.
- [x] Perbaikan import ikon di `src/components/subscriptions/SubscriptionsView.tsx` dan penambahan `'subscriptions'` ke type `NavTab` di `src/components/layout/BottomNav.tsx`.
- [x] Perbaikan skema Zod `payBillSchema` dan `assetSchema` di `src/lib/validations.ts`.
- [x] Perbaikan logic `level = 'colapse'` pada kondisi kas minus di `src/lib/collapseForecast.ts`.
- [x] Integrasi rute landing page SaaS di `/` (menampilkan landing page interaktif ketika pengguna belum login, dan dashboard penuh ketika sudah login) sehingga tidak ada konflik rute App Router.
- [x] Verifikasi `npm run test:audit` (151/151 passed), `npx tsc --noEmit` (0 error), dan `npm run build` (lulus).
- [x] Dokumentasi perubahan ke `changelog.md`.

## File yang Disentuh
- `src/app/globals.css`
- `src/components/layout/SidebarNav.tsx`
- `src/components/goals/GoalsView.tsx`
- `src/components/settings/SettingsView.tsx`
- `src/components/subscriptions/SubscriptionsView.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/lib/validations.ts`
- `src/lib/collapseForecast.ts`
- `src/lib/types.ts`
- `src/lib/apiFetch.ts`
- `src/components/landing/LandingView.tsx`
- `src/app/landing/page.tsx`
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. `npm run test:audit` menghasilkan 151 passed, 0 failed.
2. `npx tsc --noEmit` bersih tanpa error.
3. `npm run build` sukses membuat optimized production build tanpa error.
4. Landing page SaaS tampil bagi pengguna publik di `/` dan langsung masuk ke dashboard setelah login.
5. Changelog terisi sesuai format AGENTS.md.
