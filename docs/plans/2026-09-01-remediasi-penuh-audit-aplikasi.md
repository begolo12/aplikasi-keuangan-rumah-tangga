# Plan: Remediasi Penuh Audit Aplikasi

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Memperbaiki cacat keamanan, isolasi data, integritas saldo, backup, laporan, dan state UI yang ditemukan pada audit aplikasi.

## Ruang Lingkup
- [x] Perbaiki mutasi transaksi, dompet, tagihan, hutang, aset, dan target agar atomik serta konsisten.
- [x] Tegakkan autentikasi, otorisasi household, perlindungan endpoint sensitif, dan error handling aman.
- [x] Perbaiki backup/import, laporan, PWA, aksesibilitas, dan state request yang stale.
- [x] Jalankan lint, self-test, build, dan verifikasi E2E bila target database aman.

## File yang Disentuh
`src/app/api/**`, `src/lib/**`, `src/components/**`, `public/sw.js`, `scripts/**`, `docs/plans/2026-09-01-remediasi-penuh-audit-aplikasi.md`, `changelog.md`.

## Kriteria Selesai (Definition of Done)
- Tidak ada error lint; warning yang tersisa dipahami atau dihapus.
- `npm run test:audit` lulus.
- `npm run build` lulus.
- Mutasi uang memvalidasi ownership, affected rows, dan idempotency dalam transaksi yang sama.
- Endpoint sensitif tidak membocorkan detail internal dan tidak terbuka untuk akses lintas user.
- Plan berstatus `done` dan changelog diperbarui.
