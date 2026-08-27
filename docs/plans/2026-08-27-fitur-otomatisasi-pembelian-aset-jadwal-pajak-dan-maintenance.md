# Plan: Fitur Otomatisasi Pembelian Aset, Jadwal Pajak, dan Perawatan Rutin/Insidental

- Tanggal: 2026-08-27
- Status: done

## Tujuan
1. Mengintegrasikan transaksi pembelian barang/aset dengan modul Aset sehingga pembelian aset otomatis tercatat di kas dan daftar aset.
2. Menambahkan fitur **Jadwal Biaya Aset (Pajak STNK/PBB, Servis/Maintenance Rutin, dan Perbaikan Insidental)** yang terhubung langsung dengan modul Pengeluaran Pasti/Rutin (`recurring_bills`) dan Rencana Anggaran.
3. Menampilkan riwayat biaya dan pengingat jadwal pajak/servis pada setiap aset.

## Ruang Lingkup
- [x] Tambahkan kolom `asset_id` (UUID nullable) pada tabel `transactions` dan `recurring_bills` untuk menautkan pengeluaran/jadwal rutin langsung ke aset spesifik.
- [x] Tambahkan opsi otomatisasi pada `TransactionModal.tsx`: centang "Simpan sebagai Aset" saat mencatat pengeluaran pembelian barang berharga.
- [x] Tambahkan opsi otomatisasi pada `AssetModal.tsx`: opsi "Catat transaksi pembelian dari dompet" serta input jadwal pajak/servis rutin.
- [x] Buat sub-komponen modal jadwal dan biaya aset `AssetScheduleModal.tsx` di `AssetsView.tsx`.
- [x] Pastikan seluruh test audit (`npm test`) dan build check (`npm run build`) berhasil 100%.
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/app/api/init/route.ts`
- `scripts/run-db-migrations.ts`
- `src/app/api/assets/route.ts`
- `src/app/api/transactions/route.ts`
- `src/components/transactions/TransactionModal.tsx`
- `src/components/assets/AssetModal.tsx`
- `src/components/assets/AssetScheduleModal.tsx`
- `src/components/assets/AssetsView.tsx`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-otomatisasi-pembelian-aset-jadwal-pajak-dan-maintenance.md`

## Kriteria Selesai (Definition of Done)
1. Pembelian barang/aset otomatis tercatat di mutasi kas dan daftar aset.
2. Aset dapat memiliki jadwal rutin (pajak tahunan/bulanan, servis berkala) yang otomatis terintegrasi ke Pengeluaran Pasti dan Rencana Anggaran.
3. Biaya insidental perbaikan dapat dicatat dan terhubung ke aset terkait.
4. `npm test` dan `npm run build` lulus tanpa error.
