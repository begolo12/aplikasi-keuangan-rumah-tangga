# Plan: Remediasi Temuan Audit Komprehensif KasKeluarga

- Tanggal: 2026-09-08
- Status: draft

## Tujuan
Menindaklanjuti temuan audit aplikasi KasKeluarga dengan perbaikan terukur pada rate limiter, tanggal kalender lokal, proteksi same-origin, dan cache service worker tanpa mengubah kontrak finansial yang sudah berjalan.

**Sumber audit**: `docs/audits/2026-09-08-audit-aplikasi-komprehensif.md`

## Ringkasan Audit

Verifikasi dasar sudah lulus:

- `npm run test:audit`: 151 passed, 0 failed.
- `npm run lint`: PASS.
- `npm run build`: PASS; static generation 39/39.
- Smoke browser: route unauthenticated mengarah ke `/login`; `/api/auth/me` dan `/api/transactions` tanpa cookie mengembalikan `401`; form auth tidak overflow pada viewport `390×844`.

Temuan yang menjadi scope remediasi:

1. **MEDIUM — Rate limiter in-memory** (`src/lib/rateLimit.ts`): key kadaluarsa dan riwayat timestamp tidak memiliki pruning/batas global.
2. **LOW — Tanggal berbasis UTC**: default tanggal user-facing masih memakai `toISOString().split('T')[0]` pada formatter, schema, dan sejumlah modal.
3. **LOW — Same-origin defense-in-depth**: mutasi berbasis cookie belum memiliki verifikasi `Origin`/`Sec-Fetch-Site` eksplisit.
4. **LOW — Cache service worker** (`public/sw.js`): nama cache statis dan membutuhkan disiplin bump saat rilis.

## Ruang Lingkup

1. [ ] **Batch 1 — Rate limiter**: buang key yang seluruh timestamp-nya kadaluarsa, batasi riwayat timestamp, dan tambahkan pruning bounded saat jumlah key melewati ambang.
2. [ ] **Batch 2 — Tanggal lokal**: buat helper tanggal kalender lokal; migrasikan default/input/label relatif yang memang berbasis tanggal pengguna; pertahankan timestamp UTC untuk audit dan nama file yang membutuhkan ISO.
3. [ ] **Batch 3 — Same-origin**: buat helper policy same-origin untuk request mutasi cookie-backed dan terapkan ke seluruh route mutasi yang relevan, dengan penanganan deployment/proxy dan request tanpa `Origin` yang terdokumentasi.
4. [ ] **Batch 4 — Service worker**: tetapkan mekanisme bump atau sumber versi cache yang konsisten pada perubahan precache; endpoint `/api/` tetap tidak boleh dicache.
5. [ ] **Batch 5 — Verifikasi**: tambahkan self-check untuk regresi tanggal lokal dini hari (WIB/WITA/WIT) dan verifikasi tidak ada horizontal overflow pada viewport mobile; lalu jalankan `npm run test:audit`, `npm run lint`, `npm run build`, serta smoke path tanpa menyentuh port 20128.

## Catatan Regresi

- Test regresi wajib mencakup kasus rentang jam dini hari WIB saat tanggal UTC mundur satu hari.
- Tidak melakukan authenticated CRUD dalam audit ini karena tidak memakai akun uji, sehingga risiko perubahan kontrak finansial perlu dicek manual setelah setiap batch selesai.

## File yang Disentuh
- `src/lib/rateLimit.ts`
- `src/lib/formatters.ts`
- `src/lib/validations.ts`
- Modal/component yang memakai default tanggal user-facing.
- `src/lib/apiHelpers.ts`
- Route API mutasi yang dilindungi cookie.
- `public/sw.js`
- `scripts/audit-self-test.ts`
- `docs/plans/2026-09-08-audit-aplikasi-komprehensif.md`
- `changelog.md`

## Kriteria Selesai (Definition of Done)

1. Rate limiter tidak menyimpan key kosong/stale tanpa batas dan riwayat per key tetap bounded; keterbatasan multi-instance tetap terdokumentasi.
2. Default tanggal kalender pengguna benar pada rentang dini hari WIB/WITA/WIT; timestamp UTC yang memang bersifat instan tidak berubah.
3. Request mutasi cookie-backed memiliki policy same-origin yang eksplisit tanpa memutus client/proxy sah.
4. Cache service worker berubah secara deterministik saat precache berubah dan tidak pernah mencache `/api/`.
5. Self-test, lint, build, dan smoke path lulus; tidak ada regression pada validasi finansial, auth guard, atau mobile overflow.
6. Temuan yang sudah dikerjakan dicatat di changelog dan status plan diubah menjadi `done`.
