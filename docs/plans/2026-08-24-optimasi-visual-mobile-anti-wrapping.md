# Plan: Optimasi Visual Mobile & Tipografi Anti-Wrapping Angka Rupiah

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Memperbaiki visual di smartphone agar simbol mata uang "Rp" dan digit angka nominal tidak terpisah/numpuk ke baris berikutnya, serta merestrukturisasi kartu laporan keuangan agar rapi dan tidak tumpang tindih.

## Akar Masalah (Root Cause)
1. `formatRupiah` menggunakan spasi biasa antara "Rp" dan angka, sehingga pada layar sempit peramban web memotong baris di antara "Rp" dan digit angka.
2. Pada `ReportsView.tsx`, grid 2 kolom dengan `flex justify-between` di layar handphone terlalu sempit (<140px per kolom), sehingga teks label dan nominal berhimpitan dan terlipat secara canggung.
3. Sejumlah kartu komponen belum menggunakan `whitespace-nowrap tabular-nums`.

## Ruang Lingkup Perbaikan
- [x] Perbaiki `formatRupiah` di `src/lib/formatters.ts` dengan menyisipkan spasi tak terputus (*non-breaking space* `\u00A0`), mengunci "Rp" dan nominal agar selalu menjadi satu kesatuan tak terpisah di semua browser.
- [x] Restrukturisasi kartu ringkasan likuiditas & laporan bulanan di `src/components/reports/ReportsView.tsx` menjadi `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` dan `grid-cols-1 sm:grid-cols-2` dengan `whitespace-nowrap tabular-nums`.
- [x] Tambahkan `whitespace-nowrap tabular-nums` pada `MonthlySummary.tsx`, `BalanceHeader.tsx`, `DebtItem.tsx`, `DebtsView.tsx`, `BillItem.tsx`, `BudgetProgressBar.tsx`, dan `TransactionItem.tsx`.
- [x] Verifikasi: `npm test` (87/87 passed), `npm run lint` (0 warning), `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-optimasi-visual-mobile-anti-wrapping.md`
- `src/lib/formatters.ts`
- `scripts/audit-self-test.ts`
- `src/components/reports/ReportsView.tsx`
- `src/components/dashboard/MonthlySummary.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/debts/DebtItem.tsx`
- `src/components/debts/DebtsView.tsx`
- `src/components/bills/BillItem.tsx`
- `src/components/budget/BudgetProgressBar.tsx`
- `src/components/transactions/TransactionItem.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Simbol "Rp" tidak pernah terpisah atau turun baris sendirian dari nominal angkanya di perangkat mobile manapun.
2. Seluruh kartu di halaman Laporan dan Beranda tampil rapi, proporsional, dan bebas tumpang tindih.
3. Seluruh unit test dan E2E test lulus 100%.
