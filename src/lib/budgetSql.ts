/**
 * Fragmen SQL bersama untuk perhitungan anggaran dengan rollover.
 * effective_limit = monthly_limit + (limit bulan lalu - realisasi bulan lalu),
 * hanya untuk budget dengan rollover_enabled. Sisa bisa minus bila bulan lalu
 * overbudget. Dipakai bootstrap dashboard dan GET /api/budgets.
 * Prasyarat: CTE latest_budgets sudah memilih kolom rollover_enabled.
 */
export const BUDGET_ROLLOVER_CTE = `
  prev_budgets AS (
    SELECT DISTINCT ON (b.category_id) b.category_id, b.monthly_limit, b.year, b.month
    FROM budgets b
    JOIN latest_budgets l ON l.rollover_enabled = TRUE
      AND b.user_id = l.user_id AND b.category_id = l.category_id
    WHERE b.user_id = $1 AND (b.year < l.year OR (b.year = l.year AND b.month < l.month))
    ORDER BY b.category_id, b.year DESC, b.month DESC
  ),
  prev_spent AS (
    SELECT pb.category_id, COALESCE(SUM(t.amount), 0) AS spent
    FROM prev_budgets pb
    LEFT JOIN transactions t
      ON t.category_id = pb.category_id AND t.type = 'expense' AND t.user_id = $1
      AND t.date >= make_date(pb.year::int, pb.month::int, 1)
      AND t.date < make_date(pb.year::int, pb.month::int, 1) + INTERVAL '1 month'
    GROUP BY pb.category_id
  )`;

/** Ekspresi limit efektif; butuh alias b (latest_budgets), pb, ps tersedia pada query. */
export const BUDGET_EFFECTIVE_LIMIT_SQL = `(b.monthly_limit + CASE WHEN COALESCE(b.rollover_enabled, FALSE) THEN COALESCE(pb.monthly_limit, 0) - COALESCE(ps.spent, 0) ELSE 0 END)`;
