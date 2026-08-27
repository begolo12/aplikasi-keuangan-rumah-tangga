# Plan: Fitur Taksiran Harga Pasar Aset dan Analisis Plus / Minus Depresiasi

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menambahkan inputan **Taksiran Harga Pasaran Sekarang (Current Market Value)** pada modul Aset & Depresiasi, serta menghitung analisis **Plus (+) atau Minus (-)** secara transparan:
1. Mengetahui harga beli awal vs nilai depresiasi buku vs taksiran harga pasar saat ini.
2. Menghitung selisih apresiasi/depresiasi riil ($\text{Taksiran Pasar} - \text{Harga Beli}$) dan selisih terhadap nilai buku ($\text{Taksiran Pasar} - \text{Nilai Buku}$).
3. Menampilkan status badge **Plus (Untung/Apresiasi)** atau **Minus (Susut/Depresiasi)** di kartu aset dan formulir input.

## Ruang Lingkup
- [x] Perbarui helper kalkulasi depresiasi pada `calculateAssetDepreciation` di `src/app/api/assets/route.ts` dan tipe data di `src/lib/types.ts`.
- [x] Perbarui `AssetModal.tsx` dengan inputan "Taksiran Harga Pasaran Sekarang" dan simulasi langsung perbandingan Plus / Minus.
- [x] Perbarui `AssetsView.tsx` agar setiap kartu aset menampilkan Taksiran Harga Pasar, Nilai Depresiasi, dan badge indikator Plus (+) / Minus (-).
- [x] Verifikasi dengan audit unit test (`npm test`) dan build check (`npm run build`).
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/app/api/assets/route.ts`
- `src/app/api/assets/[id]/route.ts`
- `src/components/assets/AssetModal.tsx`
- `src/components/assets/AssetsView.tsx`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-taksiran-harga-pasar-aset-dan-analisis-plus-minus.md`

## Kriteria Selesai (Definition of Done)
1. Pengguna dapat menginputkan taksiran harga pasar saat ini untuk setiap aset.
2. Selisih Plus (+) atau Minus (-) terhadap harga beli awal dan nilai buku terhitung otomatis dan tampil dengan visual yang jelas.
3. `npm test` dan `npm run build` lulus tanpa error.
