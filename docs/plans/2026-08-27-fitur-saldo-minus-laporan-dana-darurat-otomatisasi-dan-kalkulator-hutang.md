# Plan: Fitur Saldo Minus, Laporan Bulanan, Dana Darurat 4x Anggaran, Otomatisasi Transaksi Rutin, dan Kalkulator Insight Hutang

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Memperbarui aplikasi KasKeluarga sesuai kebutuhan:
1. Memungkinkan saldo dompet menjadi minus (overdraft/negatif) tanpa terhalang strict-zero check.
2. Menyempurnakan modul Laporan Bulanan dengan navigasi periode, analisis arus kas, breakdown kategori, dan perbandingan bulan ke bulan.
3. Mengimplementasikan KPI Dana Darurat dengan aturan wajib 4x dari Total Anggaran Bulanan (indikator status Keuangan Aman vs Belum Aman).
4. Menambahkan fitur Pencatatan Otomatis untuk Pengeluaran Pasti (listrik, internet, cicilan hutang) dan Pemasukan Pasti (gaji, bonus, dsb) beserta eksekusi otomatis/1-klik.
5. Menambahkan Manajemen Hutang dengan Kalkulator Simulasi Hutang & Insight Keamanan Finansial (KPI rasio cicilan DTI, dampak arus kas, dan pengaruh terhadap dana darurat).

## Ruang Lingkup
- [x] Lepaskan batasan saldo strict-zero di database (drop constraint `wallets_balance_nonnegative`), validasi Zod (`walletSchema`), API routes (`transactions`, `transactions/[id]`, `debts/[id]/pay`, `bills/[id]/pay`), dan sesuaikan script audit.
- [x] Implementasikan perhitungan Dana Darurat (Emergency Fund Target = 4x Total Anggaran Bulanan), rasio progres, status KPI (Aman jika >= 4x Anggaran, Belum Aman jika < 4x Anggaran), dan visualisasi pada Dashboard, Anggaran (BudgetView), dan Evaluasi (EvaluationView).
- [x] Kembangkan modul Transaksi Rutin & Pasti (Recurring Automations) yang mendukung Pemasukan Pasti (gaji, tunjangan, dll) dan Pengeluaran Pasti (listrik, air, cicilan), beserta endpoint dan tombol eksekusi otomatis ke transaksi/dompet.
- [x] Kembangkan Kalkulator & Simulator Hutang dengan Insight Keamanan Finansial KPI (DTI ratio, dampak ke arus kas & target dana darurat 4x, kesimpulan rekomendasi keputusan aman/berisiko) dan integrasi simpan langsung ke hutang + cicilan rutin.
- [x] Sempurnakan Laporan Tiap Bulan (ReportsView) dengan navigasi periode yang mulus, perbandingan histori bulan-ke-bulan, dan ekspor data.
- [x] Verifikasi menyeluruh: jalankan audit self-test (`npm test`), build check (`npm run build`), dan pastikan tidak ada error TypeScript.

## File yang Disentuh
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/lib/apiHelpers.ts`
- `src/lib/apiFetch.ts`
- `src/app/api/init/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/wallets/route.ts`
- `src/app/api/bills/route.ts`
- `src/app/api/bills/[id]/pay/route.ts`
- `src/app/api/bills/auto-process/route.ts`
- `src/app/api/debts/[id]/pay/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/api/reports/monthly/route.ts`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/dashboard/WalletScroller.tsx`
- `src/components/budget/BudgetView.tsx`
- `src/components/budget/EmergencyFundCard.tsx`
- `src/components/bills/BillsView.tsx`
- `src/components/bills/BillItem.tsx`
- `src/components/bills/useBillForm.ts`
- `src/components/debts/DebtsView.tsx`
- `src/components/debts/DebtCalculatorModal.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/evaluation/EvaluationView.tsx`
- `src/components/wallets/WalletsView.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `scripts/audit-self-test.ts`
- `scripts/run-db-migrations.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Saldo dompet dapat bernilai minus saat pengeluaran melebihi saldo tanpa memicu error validasi atau DB constraint.
2. Dana Darurat dihitung secara otomatis dengan target 4x Total Anggaran Bulanan dan status KPI Keuangan Aman / Belum Aman ditampilkan jelas.
3. Pemasukan pasti (gaji, dll) dan pengeluaran pasti (listrik, cicilan, dll) dapat didaftarkan dan dieksekusi otomatis/1-klik ke pencatatan transaksi kas.
4. Kalkulator Hutang dapat mensimulasikan cicilan per bulan dan memberikan kesimpulan/insight KPI mengenai keamanan keuangan sebelum mengambil hutang.
5. Laporan tiap bulan dapat diakses dan menampilkan analisis komprehensif.
6. `npm test` lulus 100% dan `npm run build` berhasil tanpa error.
