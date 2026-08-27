# Plan: Fitur Proyeksi Pengeluaran Bulanan (Monthly Expense Projection)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menambahkan kalkulasi dan tampilan **Proyeksi Pengeluaran Bulanan** untuk membandingkan Rencana Anggaran Awal vs Realisasi Terkini + Estimasi Sisa Biaya, sehingga pengguna mengetahui proyeksi riil pengeluaran akhir bulan (misal rencana 1.5 jt, realisasi 1 jt + sisa 300 rb = proyeksi 1.3 jt / hemat 200 rb).

## Ruang Lingkup
- [x] Buat tipe data dan helper fungsi `calculateMonthlyExpenseProjection` untuk menghitung:
  - Total Rencana Anggaran (Planned Budget)
  - Realisasi Pengeluaran s.d. Hari Ini (Spent to date)
  - Estimasi Sisa Pengeluaran Riil (Remaining Forecast / Run-rate / Scheduled Bills)
  - Proyeksi Akhir Bulan (Projected End-of-Month Expense)
  - Estimasi Penghematan / Surplus vs Rencana Awal (Variance & Savings)
- [x] Buat komponen visual `ExpenseProjectionCard.tsx` yang menampilkan rincian rencana, realisasi, sisa estimasi, dan proyeksi akhir bulan interaktif.
- [x] Hubungkan komponen proyeksi ke `BudgetView.tsx` dan `ReportsView.tsx`.
- [x] Verifikasi seluruh test suite (`npm test`) dan build (`npm run build`).
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/components/budget/ExpenseProjectionCard.tsx`
- `src/components/budget/BudgetView.tsx`
- `src/components/reports/ReportsView.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-proyeksi-pengeluaran-bulanan.md`

## Kriteria Selesai (Definition of Done)
1. Perhitungan proyeksi pengeluaran (`Realisasi + Sisa Estimasi`) terhitung akurat.
2. Pengguna dapat melihat selisih hemat/lebih antara rencana awal dan proyeksi akhir bulan.
3. Tampilan interaktif tersedia di menu Anggaran dan Laporan.
4. `npm test` dan `npm run build` lulus tanpa error.
