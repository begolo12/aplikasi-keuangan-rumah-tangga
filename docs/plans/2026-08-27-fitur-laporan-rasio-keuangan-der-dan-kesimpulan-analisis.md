# Plan: Fitur Laporan Rasio Keuangan (DER, DAR, DSR, Likuiditas) dan Kesimpulan Analisis

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menghadirkan modul **Laporan Rasio Keuangan Lengkap (Financial Ratios Statement)** yang menghitung:
1. **DER (Debt to Equity Ratio)**: Rasio Hutang terhadap Modal/Kekayaan Bersih.
2. **DAR (Debt to Asset Ratio)**: Rasio Hutang terhadap Total Aset.
3. **DSR / DTI (Debt Service Ratio)**: Rasio Beban Cicilan Hutang terhadap Pemasukan.
4. **Liquidity Ratio**: Rasio Ketahanan Kas Likuid (Bulan).
5. **Savings Ratio**: Rasio Tabungan terhadap Pemasukan.
6. **Operating Expense Ratio (OER)**: Rasio Efisiensi Biaya Hidup terhadap Pemasukan.
7. **Kesimpulan & Rekomendasi Eksekutif**: Menilai kesehatan keuangan secara holistik (Sehat, Cukup, Waspada, Kritis) dan panduan tindakan konkret.

## Ruang Lingkup
- [x] Buat helper kalkulasi `calculateFinancialRatios` yang menghitung DER, DAR, DSR, Liquidity Ratio, Savings Ratio, OER, skor kesehatan, dan kesimpulan naratif.
- [x] Buat komponen `FinancialRatiosReport.tsx` yang menyajikan rasio-rasio tersebut dengan format kartu responsif di HP (*glanceable score & verdict*) dan tabel metrik formal di PC.
- [x] Integrasikan `FinancialRatiosReport.tsx` ke dalam `ReportsView.tsx` dan perbarui `EvaluationView.tsx`.
- [x] Verifikasi pengujian audit (`npm test`) dan build check (`npm run build`).
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/components/reports/FinancialRatiosReport.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/evaluation/EvaluationView.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-laporan-rasio-keuangan-der-dan-kesimpulan-analisis.md`

## Kriteria Selesai (Definition of Done)
1. Rasio DER, DAR, DSR/DTI, Likuiditas, Savings Ratio, dan OER terhitung akurat.
2. Kesimpulan analisis kondisi keuangan disajikan dengan bahasa yang jelas, edukatif, dan solutif.
3. Tampilan responsif (mudah dibaca di HP dan data lengkap di PC).
4. `npm test` dan `npm run build` lulus 100%.
