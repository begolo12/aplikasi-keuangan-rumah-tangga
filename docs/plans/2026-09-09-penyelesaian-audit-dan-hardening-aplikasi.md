# Plan: Penyelesaian Audit Menyeluruh dan Hardening Aplikasi

- Tanggal: 2026-09-09
- Status: done

## Tujuan
Menyelesaikan seluruh temuan audit keamanan, integritas finansial, performa database pool, dan kualitas kode pada aplikasi KasKeluarga:
1. Mengamankan endpoint bootstrap database, cron job, dan CSRF verification.
2. Memperbaiki integritas pembukuan buku besar (ledger) pada mutasi penjualan aset dan biaya admin transaksi.
3. Mengatasi saturasi koneksi pool database Neon (PERF-01) pada bootstrap dashboard dan backup export dengan query batching.
4. Mencegah XSS dengan Content-Security-Policy (SEC-06) dan pengetatan sanitasi CSV injection (SEC-07).
5. Membersihkan warning ESLint untuk menjaga kebersihan kode dan keandalan re-render React.

## Ruang Lingkup
- [x] Validasi keamanan & integritas yang sudah dibuat di working tree (SEC-01, SEC-02, SEC-03, FIN-01, FIN-02, SEC-04, SEC-05, COMPAT-01).
- [x] PERF-01: Batching eksekusi query pada `src/app/api/dashboard/bootstrap/route.ts` dan `src/app/api/backup/export/route.ts` agar tidak melebihi kapasitas pool database (`max: 10`).
- [x] SEC-06: Konfigurasi header `Content-Security-Policy` di `next.config.mjs`.
- [x] SEC-07: Perluas karakter sanitasi CSV formula injection di `src/app/api/reports/export-csv/route.ts`.
- [x] CLEAN-02: Pembersihan seluruh warning ESLint (unused vars, hooks dependencies).
- [x] Verifikasi: `npm run test:audit`, `npm run lint`, dan `npm run build` lulus 100%.

## File yang Disentuh
- `src/app/api/init/route.ts`
- `src/lib/apiHelpers.ts`
- `src/app/api/subscriptions/cron/route.ts`
- `src/app/api/assets/[id]/sell/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/lib/rateLimit.ts`
- `src/lib/auth.ts`
- `src/lib/offlineQueue.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/api/backup/export/route.ts`
- `next.config.mjs`
- `src/app/api/reports/export-csv/route.ts`
- Berkas UI/API dengan ESLint warning (page.tsx, components, scripts)
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. `npm run test:audit` lulus (151+ tests pass).
2. `npm run lint` lulus dengan 0 error dan 0 warning.
3. `npm run build` lulus tanpa error kompilasi Next.js / TypeScript.
4. Perubahan dicatat di `changelog.md` dan status plan diubah menjadi `done`.
