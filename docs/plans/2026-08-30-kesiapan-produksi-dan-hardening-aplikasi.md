# Plan: Kesiapan Produksi, Hardening Keamanan, dan Peningkatan Aplikasi

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Memastikan aplikasi KasKeluarga 100% siap produksi dengan standar keamanan finansial tinggi, performa optimal, kepatuhan anti-slop (bebas em-dash pada UI), penanganan error koneksi database yang tangguh, endpoint monitoring kesehatan sistem (/api/health), file robots/metadata privasi, serta lolos seluruh pengujian dan build Next.js.

## Ruang Lingkup
- [x] Security headers di `next.config.mjs` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- [x] Endpoint `/api/health` untuk liveness & database connection probe (standar monitoring deployment container/server).
- [x] File `src/app/robots.ts` untuk melarang indexing publik data finansial privat oleh mesin perayap (search engine).
- [x] Resiliensi koneksi database di `src/lib/db.ts` (penambahan listener error pada Neon pool untuk mencegah unhandled process crash).
- [x] Pembersihan karakter em-dash (`—`) pada seluruh teks UI, manifest, dan komponen sesuai aturan R-02 & no-ai-slop.
- [x] Penambahan pengujian unit / audit self-test untuk endpoint health dan proteksi produksi.
- [x] Verifikasi build (`npm run build`) dan pengujian menyeluruh (`npm test`).

## File yang Disentuh
- `next.config.mjs`
- `src/lib/db.ts`
- `src/app/api/health/route.ts`
- `src/app/robots.ts`
- `public/manifest.json`
- `src/components/budget/BudgetView.tsx`
- `src/components/evaluation/CollapseForecastCard.tsx`
- `src/components/calendar/CalendarView.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-30-kesiapan-produksi-dan-hardening-aplikasi.md`

## Kriteria Selesai (Definition of Done)
1. Security headers diterapkan dengan benar pada konfigurasi Next.js.
2. Endpoint `/api/health` merespons status `ok` dan menguji koneksi DB.
3. Metadata perayapan `robots.ts` mengembalikan `Disallow: /`.
4. Bebas dari em-dash (`—`) di seluruh teks antarmuka publik.
5. `npm test` lulus 100% (audit self-test dan E2E suite).
6. `npm run build` berhasil tanpa peringatan TypeScript atau syntax error.
7. Plan status diupdate menjadi `done` dan dicatat di `changelog.md`.
