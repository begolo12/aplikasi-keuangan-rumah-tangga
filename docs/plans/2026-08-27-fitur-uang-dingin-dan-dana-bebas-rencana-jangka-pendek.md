# Plan: Fitur Uang Dingin (Cold Money) dan Dana Bebas Rencana Jangka Pendek

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menghadirkan fitur kalkulasi dan laporan **Uang Dingin / Dana Bebas Rencana Jangka Pendek (Idle Free Cash / Cold Money)**:
1. Menghitung uang kas riil yang benar-benar bebas setelah dikurangi kewajiban tagihan, hutang, dan total cadangan keamanan wajib ($4.4 \times \text{Anggaran}$).
2. Menampilkan nominal Uang Dingin yang siap dan aman dipakai untuk rencana apa saja (investasi, liburan, hobi, modal usaha, atau rencana jangka pendek) tanpa mengganggu ketahanan finansial keluarga.
3. Mengintegrasikan indikator Uang Dingin pada menu Laporan (`ReportsView.tsx`, `CashflowStatement.tsx`, `BalanceSheetReport.tsx`), menu Anggaran (`FinancialSafetyPlanCard.tsx`), dan Beranda Dashboard (`BalanceHeader.tsx`).

## Ruang Lingkup
- [x] Buat helper kalkulasi `calculateColdMoney` / perbarui `FinancialSafetyPlan` dan `MonthlySummary` dengan field `cold_money_amount` dan `cold_money_status`.
- [x] Buat komponen `ColdMoneyCard.tsx` (atau integrasikan kartu khusus Uang Dingin di modul Laporan dan Dashboard).
- [x] Perbarui `ReportsView.tsx`, `CashflowStatement.tsx`, `BalanceSheetReport.tsx`, dan `BalanceHeader.tsx` untuk menampilkan informasi Uang Dingin.
- [x] Verifikasi dengan `npm test` dan `npm run build`.
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/components/reports/ColdMoneyCard.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/reports/CashflowStatement.tsx`
- `src/components/reports/BalanceSheetReport.tsx`
- `src/components/budget/FinancialSafetyPlanCard.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-uang-dingin-dan-dana-bebas-rencana-jangka-pendek.md`

## Kriteria Selesai (Definition of Done)
1. Uang Dingin terhitung akurat: kelebihan kas di atas cadangan wajib 4.4x anggaran dan kewajiban tagihan/hutang.
2. Tersedia visualisasi dan rekomendasi penggunaan uang dingin untuk rencana jangka pendek.
3. Tampilan mobile dan PC selaras (mobile ringkas & langsung terbaca, PC menyajikan rincian alokasi penuh).
4. `npm test` dan `npm run build` lulus 100%.
