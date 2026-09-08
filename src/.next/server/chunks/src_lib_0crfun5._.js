module.exports=[25694,e=>{"use strict";let t=`
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
  )`;e.s(["BUDGET_EFFECTIVE_LIMIT_SQL",0,"(b.monthly_limit + CASE WHEN COALESCE(b.rollover_enabled, FALSE) THEN COALESCE(pb.monthly_limit, 0) - COALESCE(ps.spent, 0) ELSE 0 END)","BUDGET_ROLLOVER_CTE",0,t])},14239,e=>{e.v(e=>Promise.resolve().then(()=>e(43793)))}];

//# sourceMappingURL=src_lib_0crfun5._.js.map