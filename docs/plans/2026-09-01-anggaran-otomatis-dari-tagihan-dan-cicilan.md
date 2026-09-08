# Plan: Anggaran Otomatis dari Tagihan Rutin & Cicilan

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Kartu `Resume Rencana Keamanan & Cadangan Risiko` dan `Proyeksi Pengeluaran` masih menampilkan Rp 0 (Anggaran Belum Diatur) meski user sudah punya tagihan rutin aktif dan cicilan hutang (mis. hutang/cicilan). User mengharap kebutuhan anggaran bulanan dihitung otomatis: anggaran manual + tagihan rutin + cicilan.

Contoh pada screenshot 2026-09-01: Cadangan 4 Bulan Rp 0, Cadangan Risiko Rp 0, Total Syarat Rp 0, padahal Uang Cadangan Saat Ini Rp 2.500.000. Seharusnya sudah terhitung dari tagihan/cicilan yang ada.

## Keputusan Desain
- Sumber kebutuhan bulanan = `anggaran manual (budgets)` + `tagihan rutin aktif (recurring_bills is_active & type expense)` + `cicilan hutang aktif (debts payable unpaid monthly_installment)`.
- `calculateFinancialSafetyPlan(budgets, wallets, totalExpense, bills, debts)` → `combinedBudget = sumLimits + sumBills + sumDebtInstallments`; `monthly_budget = combinedBudget >0 ? combinedBudget : totalExpense`. `is_default_budget` hanya true bila combined + totalExpense semua 0.
- `calculateExpenseProjection` sama: `planned_budget` dari combinedBudget.
- `calculateColdMoney` likewise: `monthlyBudget` dari combinedBudget (fallback 0 sebelumnya 1jt agar tidak palsu).
- `EvaluationView` expenseBenchmark dan `coldMoneyInfo` dihitung dari combinedBudget (termasuk bills/debts) — ambil bills via prop atau fetch fallback.
- `BudgetView` menerima `bills` & `debts` dari bootstrap `page.tsx` dan meneruskan ke kedua kartu.
- Deduplikasi tidak dilakukan; bila hutang auto-create bill `Cicilan: ...`, double-count dianggap konservatif (lebih aman, cadangan lebih besar). Ponytail: `// konservatif double-count bila auto-schedule`.
- Tidak ada migrasi DB, tidak ada endpoint baru.

## Ruang Lingkup
- [x] Update `FinancialSafetyPlanCard.tsx` (hitung fixedObligations)
- [x] Update `ExpenseProjectionCard.tsx` (hitung combinedBudget)
- [x] Update `ColdMoneyCard.tsx` (hapus fallback 1jt, pakai combined)
- [x] Update `BudgetView.tsx` props & wiring
- [x] Update `EvaluationView.tsx` benchmark + coldMoney + bills fetching
- [x] Update `src/app/page.tsx` pass bills/debts ke BudgetView & EvaluationView

## File yang Disentuh
- `src/components/budget/FinancialSafetyPlanCard.tsx`
- `src/components/budget/ExpenseProjectionCard.tsx`
- `src/components/budget/BudgetView.tsx`
- `src/components/reports/ColdMoneyCard.tsx`
- `src/components/evaluation/EvaluationView.tsx`
- `src/app/page.tsx`

## Kriteria Selesai
1. Bila ada tagihan rutin / cicilan, kartu Resume & Proyeksi menampilkan angka >0 tanpa perlu anggaran manual.
2. `npm run lint` 0 error, `npm run build` sukses, `npm test` 136+52 lulus.
