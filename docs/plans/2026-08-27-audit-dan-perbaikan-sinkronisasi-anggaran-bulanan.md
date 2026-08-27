# Plan: Audit & Perbaikan Sinkronisasi Anggaran Bulanan (Auto Carry-Forward & Live Real-Time Spent)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Memperbaiki dan mengaudit sinkronisasi data anggaran bulanan:
1. Menghadirkan mekanisme **Auto Carry-Forward**: anggaran bulanan per kategori yang telah ditetapkan pengguna otomatis aktif dan berlaku untuk bulan-bulan berikutnya tanpa perlu input ulang setiap ganti bulan.
2. Memastikan perhitungan `spent` (realisasi pengeluaran), `remaining` (sisa limit), dan `percentage` (%) dihitung secara *live* berdasarkan transaksi pengeluaran pada bulan dan tahun yang sedang dipilih pengguna.
3. Menyelaraskan seluruh modul yang bergantung pada total anggaran (Dana Darurat 4.4x Anggaran, Proyeksi Pengeluaran Bulanan, Resume Rencana Keuangan, dan Rasio Keuangan DER/Liquidity).

## Ruang Lingkup
- [x] Perbarui query di `src/app/api/budgets/route.ts` untuk mengambil anggaran bulan aktif atau batas anggaran terakhir untuk setiap kategori, dengan perhitungan `spent` yang terisolasi pada periode bulan yang diminta.
- [x] Perbarui query di `src/app/api/dashboard/bootstrap/route.ts` dan `src/app/api/reports/monthly/route.ts` selaras.
- [x] Verifikasi sinkronisasi dengan unit test `scripts/audit-self-test.ts` dan E2E test `scripts/e2e-full-suite.ts`.
- [x] Jalankan `npm test` dan `npm run build`.
- [x] Catat ke `changelog.md` dan tandai plan doc `done`.

## File yang Disentuh
- `src/app/api/budgets/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/api/reports/monthly/route.ts`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`
- `docs/plans/2026-08-27-audit-dan-perbaikan-sinkronisasi-anggaran-bulanan.md`

## Kriteria Selesai (Definition of Done)
1. Anggaran yang pernah dibuat tetap tampil dan aktif di bulan berjalan maupun bulan berikutnya dengan `spent` yang sesuai transaksi bulan tersebut.
2. Saat user mengubah batas anggaran di bulan aktif, data tersimpan atomik dan memperbarui seluruh metrik KPI.
3. `npm test` dan `npm run build` lulus 100%.
