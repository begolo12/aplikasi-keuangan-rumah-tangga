# Plan: Laporan Keuangan Lengkap (Neraca, Laba Rugi, dan Arus Kas) — Mobile Simple & PC Full Data

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menghadirkan modul **Laporan Keuangan Komprehensif (Complete Financial Statements)** yang memuat:
1. **Laporan Neraca Keuangan Keluarga (Balance Sheet)**: Rincian Aset Likuid, Piutang, Aset Tetap vs Liabilitas (Hutang/Tagihan) dan Ekuitas Kekayaan Bersih (*Net Worth*).
2. **Laporan Laba Rugi (Income Statement)**: Pemasukan vs Pengeluaran & Beban Penyusutan Aset vs Surplus/Defisit Bersih.
3. **Desain Adaptif Responsif**:
   - **Mobile (Handphone)**: Sangat simpel, bersih, tidak rumit, langsung terbaca apakah kondisi keuangan **Baik** atau **Jelek/Waspada**.
   - **PC (Desktop / Layar Lebar)**: Format laporan keuangan formal berpasangan (Neraca kiri-kanan), tabel akun rinci, rasio keuangan, dan ekspor.

## Ruang Lingkup
- [x] Buat komponen `BalanceSheetReport.tsx` yang menghitung dan merender Neraca Keuangan (Aset vs Liabilitas vs Ekuitas).
- [x] Buat komponen `IncomeStatementReport.tsx` (Laporan Laba Rugi Rumah Tangga).
- [x] Perbarui `ReportsView.tsx` dengan tab navigasi:
  - Tab 1: **Ringkasan & Kategori (Overview)**
  - Tab 2: **Laporan Arus Kas (Cashflow)**
  - Tab 3: **Neraca Keuangan (Balance Sheet)**
  - Tab 4: **Laporan Laba Rugi (Income Statement)**
- [x] Sempurnakan tampilan Mobile agar menyajikan kesimpulan cepat kondisi keuangan (Baik vs Waspada vs Kritis) tanpa kerumitan scroll atau tabel padat.
- [x] Verifikasi seluruh test suite (`npm test`) dan build (`npm run build`).
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/components/reports/BalanceSheetReport.tsx`
- `src/components/reports/IncomeStatementReport.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/reports/CashflowStatement.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-laporan-keuangan-lengkap-neraca-dan-laba-rugi.md`

## Kriteria Selesai (Definition of Done)
1. Neraca Keuangan menghitung Total Aset = Total Liabilitas + Kekayaan Bersih dengan akurat.
2. Laporan Laba Rugi membedakan pemasukan, belanja operasional, dan beban penyusutan aset.
3. Tampilan di HP ringkas dan menyimpulkan status baik/jelek secara instan.
4. Tampilan di PC menyajikan neraca format lengkap berpasangan.
5. `npm test` dan `npm run build` lulus 100%.
