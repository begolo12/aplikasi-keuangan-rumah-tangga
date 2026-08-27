# Plan: Laporan Khusus Cashflow, Indikator Surplus/Defisit, dan Status Efisiensi Rencana (Mobile Simple & PC Full)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
1. Menghadirkan indikator instan **Status Surplus vs Defisit** (Arus Kas Bersih) pada bulan berjalan.
2. Menghadirkan indikator status **Efisien (Hemat) vs Inefisien (Boros/Overbudget)** terhadap Rencana Anggaran.
3. Menambahkan **Laporan Khusus Cashflow (Cashflow Statement)** dengan rincian Arus Masuk, Arus Keluar, Arus Bersih, dan Rekonsiliasi Saldo Awal vs Akhir Bulan.
4. Menerapkan tata letak responsif: tampilan **Mobile ringkas & mudah dibaca (clean, glanceable)**, dan tampilan **PC menyajikan data lengkap (full data tables & analytical breakdown)**.

## Ruang Lingkup
- [x] Buat komponen `CashflowStatement.tsx` (sub-modul Laporan Khusus Arus Kas) dengan visualisasi ringkas di HP dan tabel breakdown analitis di PC.
- [x] Perbarui `MonthlySummary.tsx` dan `BalanceHeader.tsx` agar badge status Surplus/Defisit dan status Efisiensi Rencana (Efisien vs Inefisien) langsung terlihat secara instan.
- [x] Perbarui `ExpenseProjectionCard.tsx` dengan badge status **Efisien** vs **Inefisien** yang mencolok dan edukatif.
- [x] Sempurnakan `ReportsView.tsx` dengan tab navigasi antara "Ringkasan & Kategori" dan "Laporan Khusus Cashflow".
- [x] Verifikasi `npm test` dan `npm run build`.
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/components/dashboard/MonthlySummary.tsx`
- `src/components/budget/ExpenseProjectionCard.tsx`
- `src/components/reports/CashflowStatement.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-laporan-cashflow-status-surplus-defisit-dan-efisiensi-rencana.md`

## Kriteria Selesai (Definition of Done)
1. Indikator Surplus / Defisit bulan berjalan tampil instan dan mudah dipahami.
2. Status Efisien (di bawah rencana) vs Inefisien (di atas rencana) terhitung dan berlabel jelas.
3. Laporan Khusus Cashflow menampilkan rincian arus kas masuk, keluar, bersih, dan pergerakan saldo bulanan.
4. Tampilan di HP ringkas dan tidak rumit, sedangkan di PC menyajikan data lengkap.
5. `npm test` dan `npm run build` 100% lulus.
