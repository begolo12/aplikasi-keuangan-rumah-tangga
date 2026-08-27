# Plan: Fitur Penjualan Aset, Pemasukan Kas Otomatis, dan Hitungan Untung/Rugi dari Sisa Depresiasi

- Tanggal: 2026-08-27
- Status: running

## Tujuan
Menghadirkan fitur **Pelepasan / Penjualan Aset (Sell Asset)**:
1. Menandai aset sebagai terjual (`sold_date`, `selling_price`), mengeluarkannya dari aset aktif.
2. Otomatis menonaktifkan seluruh jadwal rutin (pajak/servis) yang tertaut ke aset tersebut di `recurring_bills`.
3. Otomatis mencatat transaksi pemasukan kas (`income`) dari hasil penjualan aset ke dompet penerima.
4. Menghitung secara transparan apakah penjualan tersebut **Plus (+) Untung** atau **Minus (-) Rugi** dibandingkan dengan **Nilai Buku Sisa Depresiasi** dan Harga Beli Awal.

## Ruang Lingkup
- [ ] Tambahkan kolom `is_sold` (boolean), `sold_date` (date), `selling_price` (numeric), dan `gain_loss` (numeric) pada tabel `assets` dan jalankan migrasi DB.
- [ ] Buat endpoint API `/api/assets/[id]/sell` untuk memproses penjualan aset secara atomik:
  - Hitung Nilai Buku s.d. tanggal jual
  - Hitung Untung / Rugi ($\text{Harga Jual} - \text{Nilai Buku Sisa}$)
  - Catat transaksi pemasukan kas
  - Tambah saldo dompet penerima
  - Nonaktifkan jadwal rutin terkait di `recurring_bills`
  - Update status aset menjadi `is_sold = TRUE`
- [ ] Buat komponen modal `SellAssetModal.tsx` dengan kalkulasi interaktif live preview Plus / Minus.
- [ ] Tambahkan tombol "Jual Aset" dan filter tab Aset Aktif vs Terjual di `AssetsView.tsx`.
- [ ] Verifikasi pengujian audit (`npm test`) dan build (`npm run build`).
- [ ] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/lib/apiFetch.ts`
- `src/app/api/init/route.ts`
- `scripts/run-db-migrations.ts`
- `src/app/api/assets/[id]/sell/route.ts`
- `src/app/api/assets/route.ts`
- `src/components/assets/SellAssetModal.tsx`
- `src/components/assets/AssetsView.tsx`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-penjualan-aset-dan-kalkulasi-untung-rugi-depresiasi.md`

## Kriteria Selesai (Definition of Done)
1. Penjualan aset otomatis mencatat transaksi pemasukan kas dan menambah saldo dompet.
2. Seluruh jadwal tagihan pajak/servis terkait aset otomatis nonaktif.
3. Selisih Plus (+) Untung / Minus (-) Rugi dari sisa depresiasi terhitung dan ditampilkan jelas.
4. `npm test` dan `npm run build` lulus 100%.
