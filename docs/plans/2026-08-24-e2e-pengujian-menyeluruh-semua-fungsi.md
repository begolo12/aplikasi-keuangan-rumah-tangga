# Plan: Pengujian End-to-End (E2E) Menyeluruh Semua Fungsi KasKeluarga

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Melakukan pengujian End-to-End (E2E) otomatis menyeluruh terhadap seluruh fitur dan fungsi aplikasi KasKeluarga dengan database riil, mencakup registrasi, login, isolasi data, transaksi, transfer dompet, anggaran, tagihan rutin, hutang-piutang, kalkulasi arus kas safe-to-spend, laporan bulanan, ekspor CSV, serta backup & restore JSON.

## Ruang Lingkup Pengujian E2E
- [x] 1. Registrasi Akun Baru & Auto-seeding Kategori/Dompet
- [x] 2. Login, Autentikasi JWT Cookie, & Verifikasi `/api/auth/me`
- [x] 3. Dashboard Bootstrap API (`GET /api/dashboard/bootstrap`)
- [x] 4. Modul Dompet: Tambah Dompet, Mutasi Saldo, Pencegahan Saldo Negatif (Strict-Zero)
- [x] 5. Modul Kategori: Tambah Kategori Pengeluaran/Pemasukan
- [x] 6. Modul Transaksi: Input Pengeluaran, Input Pemasukan, Transfer Antar Dompet
- [x] 7. Modul Anggaran: Pembuatan Batas Pengeluaran Kategori & Real-time Spent Tracking
- [x] 8. Modul Tagihan Rutin: Tambah Tagihan & Pembayaran Tagihan Atomik
- [x] 9. Modul Hutang & Piutang: Tambah Hutang/Piutang, Pembayaran Cicilan Atomik & Sinkronisasi Dompet
- [x] 10. Modul Laporan: Laporan Bulanan, Laporan Kategori, & Kalkulasi *Safe-to-Spend*
- [x] 11. Modul Backup & Restore: Ekspor JSON, Ekspor CSV, & Impor Data dengan Proteksi Isolasi User
- [x] 12. Modul Pengaturan: Pembaruan Nama Keluarga & Preferensi Mata Uang
- [x] 13. Pembersihan Data Uji (Teardown & Cascade Delete)

## File yang Disentuh
- `docs/plans/2026-08-24-e2e-pengujian-menyeluruh-semua-fungsi.md`
- `scripts/e2e-full-suite.ts`
- `package.json`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Script E2E `scripts/e2e-full-suite.ts` mengeksekusi seluruh 25 assertion fungsional tanpa ada kegagalan (25/25 PASS).
2. `npm test` (kombinasi 62 unit assertion + 25 E2E assertion = 87 assertions) lulus 100%.
3. `npm run lint` 0 error/warning, `npm run build` sukses.
