# Plan: Fix Parameter Query Bootstrap & Sweep Mismatch Param SQL

- Tanggal: 2026-09-01
- Status: done

## Tujuan
`GET /api/dashboard/bootstrap` mengembalikan 500 dengan error Postgres 08P01: `bind message supplies 1 parameters, but prepared statement "" requires 3`. Akar masalah: query debts di bootstrap memakai placeholder `$2`/`$3` (untuk month/year) tetapi params hanya `[uid]`. Hasil akhir: semua query di seluruh `src/app/api/**` konsisten jumlah placeholder vs params, bootstrap kembali 200 untuk semua bulan 1..12.

## Ruang Lingkup
- [x] Baca seluruh `src/app/api/dashboard/bootstrap/route.ts`, perbaiki query debts (params `[uid]` → `[uid, month, year]`), pastikan semantik `is_due_this_period` tetap: hutang unpaid yang jatuh tempo bulan terpilih, sudah terlewat, atau tanpa due_date.
- [x] Cek `src/app/api/reports/monthly/route.ts` (CASE identik), perbaiki bila mismatch sama.
- [x] Sweep seluruh `src/app/api/**/*.ts`: placeholder maksimum `$N` == panjang params per panggilan `query(...)`; kandidat dikonfirmasi manual; file query dinamis dibaca manual.
- [x] Verifikasi perilaku: skrip tsx sementara memuat env (tanpa mencetak), ambil user nyata, panggil `GET` bootstrap langsung dengan NextRequest + cookie JWT sah (createSessionToken), loop month 1..12, pastikan 200 tanpa 08P01, lalu hapus skrip.
- [x] `npm run lint` (0 error, warning tidak bertambah dari 7) dan `npm run build` sukses.
- [x] Catat ke changelog.md.

## File yang Disentuh
- `src/app/api/dashboard/bootstrap/route.ts` (perbaikan params)
- `src/app/api/reports/monthly/route.ts` (cek, perbaiki bila perlu)
- `scripts/_tmp-param-scan.ts`, `scripts/_tmp-verify-bootstrap.ts` (sementara, dihapus setelah selesai)
- `docs/plans/2026-09-01-fix-parameter-query-bootstrap.md`, `changelog.md`

## Kriteria Selesai (Definition of Done)
- Semua query di `src/app/api/**` lolos cek placeholder vs params.
- Verifikasi langsung `GET` bootstrap: status 200 untuk month 1..12, tidak ada 08P01.
- `npm run lint`: 0 error, warning <= 7. `npm run build`: sukses.
- Plan doc status `done` + entri changelog baru di paling atas.
