# Plan: Penyempurnaan Bahasa Laporan Keuangan Keluarga (Mengganti Istilah Korporat Bisnis)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Mengubah istilah-istilah bisnis/korporat kaku (seperti "Laba Rugi", "P&L", "Operating Expenses", "Aktiva/Pasiva", "Capital Gain/Loss") menjadi bahasa keuangan pribadi/rumah tangga yang alami, ramah, dan mudah dipahami:
1. "Laporan Laba Rugi (P&L)" $\rightarrow$ **"Laporan Pemasukan & Belanja (Surplus/Defisit)"**.
2. "Laba Bersih / Surplus Operasional" $\rightarrow$ **"Sisa Uang Bersih (Surplus Bersih Keluarga)"**.
3. "Beban Kas Operasional" $\rightarrow$ **"Belanja Kebutuhan Hidup & Tagihan Rutin"**.
4. "Beban Non-Kas Depresiasi" $\rightarrow$ **"Penyusutan Nilai Barang/Aset"**.
5. "Aktiva & Pasiva" $\rightarrow$ **"Harta Kekayaan (Aset)" & "Kewajiban Hutang & Kekayaan Bersih"**.
6. "Capital Gain / Capital Loss" $\rightarrow$ **"Untung Penjualan Aset (+)" / "Selisih Susut Jual (-)"**.

## Ruang Lingkup
- [x] Perbarui teks pada `IncomeStatementReport.tsx`
- [x] Perbarui teks pada `BalanceSheetReport.tsx`
- [x] Perbarui teks pada `SellAssetModal.tsx`
- [x] Perbarui label tab di `ReportsView.tsx`
- [x] Verifikasi pengujian audit (`npm test`) dan build check (`npm run build`).
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/components/reports/IncomeStatementReport.tsx`
- `src/components/reports/BalanceSheetReport.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/assets/SellAssetModal.tsx`
- `changelog.md`
- `docs/plans/2026-08-27-penyempurnaan-bahasa-laporan-keuangan-keluarga.md`

## Kriteria Selesai (Definition of Done)
1. Seluruh istilah bernuansa bisnis korporat telah disesuaikan menjadi bahasa keuangan keluarga yang ramah dan jelas.
2. `npm test` dan `npm run build` lulus tanpa error.
