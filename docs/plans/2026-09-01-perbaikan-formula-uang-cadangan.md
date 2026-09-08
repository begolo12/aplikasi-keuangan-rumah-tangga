# Plan: Perbaikan Formula Uang Cadangan (Safety Plan)

- Tanggal: 2026-09-01
- Status: done

## Tujuan
User dengan saldo kas Rp 38.350.000 ditampilkan "Uang Cadangan Saat Ini: Rp 0" dan status merah di kartu Resume Rencana Keamanan. Penyebabnya: `calculateFinancialSafetyPlan` menghitung `current_cash` HANYA dari dompet tipe `savings` begitu ada satu dompet savings (dompet cash/bank/ewallet diabaikan). Ini inkonsisten dengan `calculateColdMoney` dan kartu Dana Bebas di dashboard yang menghitung seluruh kas likuid.

## Ruang Lingkup
- [ ] `current_cash` = jumlah saldo positif SEMUA dompet (konsisten dengan `calculateColdMoney.total_liquid_cash`).
- [ ] Pastikan unit test `calculateFinancialSafetyPlan` tetap lulus (test memakai dompet cash, tidak terpengaruh).

## File yang Disentuh
- `src/components/budget/FinancialSafetyPlanCard.tsx` (fungsi `calculateFinancialSafetyPlan` saja)

## Kriteria Selesai
1. Kartu safety plan menghitung uang cadangan dari seluruh kas likuid (semua tipe dompet, saldo positif).
2. `npm run lint`, `npm run build`, `npm test` lulus.
