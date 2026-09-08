# Plan: Optimasi Efisiensi — Hapus Kode Mati Hasil Audit Ponytail

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Aplikasi dibuat se-efisien mungkin lewat penghapusan (deletion over addition): kode mati,
skrip debug sekali-pakai, dan dependensi redundan hasil audit ponytail-audit 2026-09-02.
Tidak ada fitur yang berubah.

## Ruang Lingkup
- [ ] Hapus 4 skrip debug sekali-pakai: `scripts/check-db.ts`, `scripts/check-table-cols.ts`, `scripts/test-record-transactions.ts`, `scripts/verify-bootstrap-query.ts` (374 baris; sudah ditutupi `test:audit`/`test:e2e`)
- [ ] Hapus `getCurrentPeriod()` dari `src/lib/formatters.ts` (nol pemanggil)
- [ ] Hapus `endpoints.authMe` dari `src/lib/apiFetch.ts` (nol pemanggil; `page.tsx` memanggil `/api/auth/me` langsung)
- [ ] Uninstall devDependency `@types/bcryptjs` (bcryptjs v3 sudah bawa `index.d.ts` sendiri)

## File yang Disentuh
- `scripts/check-db.ts` (hapus)
- `scripts/check-table-cols.ts` (hapus)
- `scripts/test-record-transactions.ts` (hapus)
- `scripts/verify-bootstrap-query.ts` (hapus)
- `src/lib/formatters.ts` (hapus 1 fungsi)
- `src/lib/apiFetch.ts` (hapus 1 entri endpoints)
- `package.json` + `package-lock.json` (via `npm uninstall`)

## Di Luar Scope (diputuskan tidak dikerjakan)
- Ekstraksi helper `loadEnvLocal()` bersama untuk sisa 2 skrip (`run-db-migrations.ts`, `e2e-full-suite.ts`) — hanya 2 salinan, ekstraksi menambah indireksi tanpa untung berarti.
- `debug.log` & `tsconfig.tsbuildinfo` — sudah tercakup `.gitignore`.

## Kriteria Selesai (Definition of Done)
- `npm run build` lulus tanpa error TypeScript baru.
- `npm run test:audit` lulus (non-destruktif).
- Tidak ada referensi tersisa ke fungsi/entri/skrip yang dihapus.
