import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';
import { YearlyReportData, YearlyMonthDatum, YearlyCategoryDatum } from '@/lib/types';
import {
  TRANSACTION_INCOME_SQL,
  TRANSACTION_EXPENSE_SQL,
  TRANSACTION_AMOUNT_WITH_FEE_SQL,
} from '@/lib/reportSql';

/**
 * Laporan tahunan: tren arus kas 12 bulan, YoY per kategori,
 * top 5 kategori pengeluaran, dan tabungan bersih setahun.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const q = periodQuerySchema.parse({
      year: sp.get('year') ?? undefined,
    });
    const year = q.year ?? new Date().getFullYear();
    const prevYear = year - 1;

    const [monthlyRes, categoryRes] = await Promise.all([
      query(
        `SELECT
           EXTRACT(MONTH FROM t.date)::int AS month,
           ${TRANSACTION_INCOME_SQL}::float AS income,
           ${TRANSACTION_EXPENSE_SQL}::float AS expense
         FROM transactions t
          WHERE (t.user_id = $1 OR t.wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           AND t.date >= make_date($2::int, 1, 1)
           AND t.date < make_date($2::int, 1, 1) + INTERVAL '1 year'
         GROUP BY 1
         ORDER BY 1`,
        [session.userId, year]
      ),
      query(
        `WITH cat_cur AS (
           SELECT c.id, c.name, c.icon, c.color, ${TRANSACTION_AMOUNT_WITH_FEE_SQL}::float AS amount
           FROM transactions t
           JOIN categories c ON t.category_id = c.id
            WHERE (t.user_id = $1 OR t.wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))) AND t.type = 'expense'
             AND t.date >= make_date($2::int, 1, 1)
             AND t.date < make_date($2::int, 1, 1) + INTERVAL '1 year'
           GROUP BY c.id, c.name, c.icon, c.color
         ),
         cat_prev AS (
           SELECT c.id, ${TRANSACTION_AMOUNT_WITH_FEE_SQL}::float AS amount
           FROM transactions t
           JOIN categories c ON t.category_id = c.id
            WHERE (t.user_id = $1 OR t.wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))) AND t.type = 'expense'
             AND t.date >= make_date($3::int, 1, 1)
             AND t.date < make_date($3::int, 1, 1) + INTERVAL '1 year'
           GROUP BY c.id
         )
         SELECT
           COALESCE(cur.id, prev.id) AS id,
           COALESCE(cur.name, prev_cat.name) AS name,
           COALESCE(cur.icon, prev_cat.icon, 'tag') AS icon,
           COALESCE(cur.color, prev_cat.color, 'gray') AS color,
           COALESCE(cur.amount, 0) AS current_amount,
           COALESCE(prev.amount, 0) AS previous_amount
         FROM cat_cur cur
         FULL OUTER JOIN cat_prev prev ON cur.id = prev.id
         LEFT JOIN categories prev_cat ON prev.id = prev_cat.id
         ORDER BY COALESCE(cur.amount, 0) DESC`,
        [session.userId, year, prevYear]
      ),
    ]);

    const monthMap = new Map<number, { income: number; expense: number }>();
    for (const row of monthlyRes as { month: number; income: number; expense: number }[]) {
      monthMap.set(Number(row.month), { income: Number(row.income), expense: Number(row.expense) });
    }
    const months: YearlyMonthDatum[] = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const found = monthMap.get(m) ?? { income: 0, expense: 0 };
      return { month: m, income: found.income, expense: found.expense, net: found.income - found.expense };
    });

    const categories: YearlyCategoryDatum[] = (categoryRes as {
      id: string; name: string; icon: string; color: string; current_amount: number; previous_amount: number;
    }[]).map((row) => {
      const current = Number(row.current_amount);
      const previous = Number(row.previous_amount);
      const delta = current - previous;
      const delta_pct = previous > 0 ? (delta / previous) * 100 : current > 0 ? null : 0;
      return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        current_amount: current,
        previous_amount: previous,
        delta,
        delta_pct,
      };
    });

    const totalIncome = months.reduce((acc, m) => acc + m.income, 0);
    const totalExpense = months.reduce((acc, m) => acc + m.expense, 0);

    const data: YearlyReportData = {
      year,
      months,
      categories,
      top_categories: categories.filter((c) => c.current_amount > 0).slice(0, 5),
      total_income: totalIncome,
      total_expense: totalExpense,
      net_savings: totalIncome - totalExpense,
      savings_rate_pct: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error, 'reports:yearly');
  }
}
