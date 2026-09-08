# Plan: Rollover Anggaran Per Kategori

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Sisa anggaran bulan sebelumnya (boleh minus bila bulan lalu overbudget) dapat dibawa
ke bulan berjalan untuk kategori anggaran yang mengaktifkan rollover.

## Ruang Lingkup
- [ ] Migrasi idempoten: `budgets.rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE` (init route + run-db-migrations)
- [ ] `budgetSchema` + update schema: terima `rollover_enabled`
- [ ] SQL bootstrap & `GET /api/budgets`: hitung `effective_limit = monthly_limit + (limit_bulan_lalu - spent_bulan_lalu)` untuk budget rollover; kembalikan `rollover_amount` & `effective_limit`; `remaining`/`percentage` vs effective limit
- [ ] UI: checkbox rollover di form anggaran, badge sisa bulan lalu di `BudgetProgressBar`

## File yang Disentuh
- `src/app/api/init/route.ts`, `scripts/run-db-migrations.ts`
- `src/lib/validations.ts`, `src/lib/types.ts`, `src/lib/budgetSql.ts` (baru: CTE bersama)
- `src/app/api/dashboard/bootstrap/route.ts`, `src/app/api/budgets/route.ts`, `src/app/api/budgets/[id]/route.ts`
- `src/components/budget/BudgetView.tsx`, `src/components/budget/BudgetProgressBar.tsx`

## Kriteria Selesai (Definition of Done)
- `npm run build` lulus, `npm run test:audit` lulus (tambah assert schema rollover),
  migrasi idempoten jalan tanpa error, angka anggaran konsisten di list & over-budget count.
