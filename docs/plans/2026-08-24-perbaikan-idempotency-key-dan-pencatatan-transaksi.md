# Plan: Perbaikan Kolom Idempotency Key & Error Mapping Pencatatan Transaksi

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Memperbaiki kendala kegagalan simpan transaksi pada database live akibat kolom `idempotency_key` yang belum terbuat pada tabel `transactions`, serta meningkatkan kejelasan pesan error database di level API handler.

## Akar Masalah (Root Cause)
1. Endpoint `POST /api/transactions` menyertakan kolom `idempotency_key` pada query `INSERT INTO transactions`.
2. Kolom `idempotency_key` belum termigrasi di database live Neon Postgres, menyebabkan database menolak query dengan error `column "idempotency_key" does not exist`.
3. Handler `handleRouteError` belum memetakan kode error spesifik PostgreSQL (seperti pelanggaran constraint saldo `23514` atau `23505`), sehingga error dibungkus sebagai 500 generik.

## Ruang Lingkup Perbaikan
- [x] Jalankan migrasi DDL pada live database Neon: `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key UUID;` dan buat unique partial index `idx_trx_idempotency`.
- [x] Tingkatkan `handleRouteError` di `src/lib/apiHelpers.ts` untuk memetakan kode error database PostgreSQL (`23514`, `23505`, `23503`, `22P02`) menjadi pesan error bisnis yang informatif dan ramah pengguna.
- [x] Uji alur pencatatan riil transaksi pengeluaran, pemasukan, dan transfer pada database langsung via `scripts/test-record-transactions.ts` (100% PASS).
- [x] Verifikasi: `npm test` (87/87 assertions passed), `npm run lint` (0 errors/warnings), `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-perbaikan-idempotency-key-dan-pencatatan-transaksi.md`
- `scripts/run-db-migrations.ts`
- `scripts/test-record-transactions.ts`
- `src/lib/apiHelpers.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Seluruh transaksi (pengeluaran, pemasukan, dan transfer) tersimpan dengan sukses tanpa error 500.
2. Migrasi kolom dan indeks database live aktif dan terverifikasi.
3. Seluruh unit test dan E2E test lulus 100%.
