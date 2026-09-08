import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { InsightItem, InsightsData } from '@/lib/types';

const SPIKE_MIN_ABSOLUTE = 50_000; // Lonjakan kecil diabaikan agar insight tidak berisik
const SPIKE_THRESHOLD_PCT = 30;

type Severity = 'high' | 'medium' | 'low';

/**
 * Insight pintar otomatis: deteksi lonjakan kategori, dompet minus,
 * saran pelunasan tagihan awal, dan skor kesehatan keuangan bulan berjalan.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const uid = session.userId;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [spikeRes, walletRes, billRes, summaryRes, budgetRes, debtRes] = await Promise.all([
      // Lonjakan kategori: bulan ini vs rata-rata 3 bulan sebelumnya
      query(
        `WITH cur AS (
           SELECT c.id, c.name, COALESCE(SUM(t.amount), 0)::float AS amount
           FROM transactions t JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = $1 AND t.type = 'expense'
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           GROUP BY c.id, c.name
         ),
         past AS (
           SELECT c.id, COALESCE(SUM(t.amount), 0)::float AS amount
           FROM transactions t JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = $1 AND t.type = 'expense'
             AND t.date >= make_date($3::int, $2::int, 1) - INTERVAL '3 months'
             AND t.date < make_date($3::int, $2::int, 1)
           GROUP BY c.id
         )
         SELECT cur.name, cur.amount AS current_amount, COALESCE(past.amount, 0) AS avg_amount
         FROM cur LEFT JOIN past ON cur.id = past.id
         WHERE cur.amount >= $4
           AND cur.amount > COALESCE(past.amount, 0) * (1 + $5::float / 100)
         ORDER BY cur.amount DESC
         LIMIT 3`,
        [uid, month, year, SPIKE_MIN_ABSOLUTE, SPIKE_THRESHOLD_PCT]
      ),
      query(
        `SELECT name, balance::float AS balance FROM wallets
         WHERE user_id = $1 AND balance < 0 ORDER BY balance ASC`,
        [uid]
      ),
      query(
        `SELECT b.id, b.title, b.amount::float AS amount, b.due_day,
                c.name AS category_name
         FROM recurring_bills b
         LEFT JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
         LEFT JOIN bill_payments bp
           ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
         WHERE b.user_id = $1 AND b.is_active = TRUE AND COALESCE(b.type, 'expense') = 'expense' AND bp.id IS NULL
         ORDER BY b.due_day ASC`,
        [uid, month, year]
      ),
      query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS expense
         FROM transactions
         WHERE user_id = $1
           AND date >= make_date($3::int, $2::int, 1)
           AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'`,
        [uid, month, year]
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM (
           WITH latest_budgets AS (
             SELECT DISTINCT ON (category_id) id, category_id, monthly_limit, month, year
             FROM budgets
             WHERE user_id = $1 AND (year < $3 OR (year = $3 AND month <= $2))
             ORDER BY category_id, year DESC, month DESC
           )
           SELECT b.id, b.monthly_limit
           FROM latest_budgets b
           LEFT JOIN transactions t
             ON t.category_id = b.category_id AND t.type = 'expense' AND t.user_id = $1
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           GROUP BY b.id, b.monthly_limit
           HAVING COALESCE(SUM(t.amount), 0) > b.monthly_limit
         ) over_budgets`,
        [uid, month, year]
      ),
      query(
        `SELECT COALESCE(SUM(total_amount - paid_amount), 0)::float AS total_payable
         FROM debts WHERE user_id = $1 AND type = 'payable' AND status != 'paid'`,
        [uid]
      ),
    ]);

    const insights: InsightItem[] = [];

    // 1. Lonjakan pengeluaran kategori
    for (const row of spikeRes as { name: string; current_amount: number; avg_amount: number }[]) {
      const avg = Number(row.avg_amount) / 3;
      const pct = avg > 0 ? Math.round(((Number(row.current_amount) - avg) / avg) * 100) : 100;
      insights.push({
        type: 'spike',
        severity: pct > 80 ? 'high' : 'medium',
        title: `Lonjakan "${row.name}"`,
        description: `Pengeluaran kategori ini bulan ini ${pct}% di atas rata-rata 3 bulan sebelumnya.`,
      });
    }

    // 2. Dompet minus
    for (const row of walletRes as { name: string; balance: number }[]) {
      insights.push({
        type: 'overdraft',
        severity: 'high',
        title: `Dompet "${row.name}" minus`,
        description: `Saldo saat ini ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.balance)}. Segera isi ulang agar transaksi berikutnya tidak menggali defisit.`,
      });
    }

    // 3. Saran bayar tagihan lebih awal
    const wallets = await query<{ id: string; name: string; balance: number }>(
      `SELECT id, name, balance::float AS balance FROM wallets WHERE user_id = $1 AND balance > 0 ORDER BY balance DESC`,
      [uid]
    );
    const dayOfMonth = now.getDate();
    for (const bill of billRes as { id: string; title: string; amount: number; due_day: number; category_name: string | null }[]) {
      const daysUntilDue = bill.due_day - dayOfMonth;
      if (daysUntilDue < 0 || daysUntilDue > 7) continue;
      const fundable = wallets.find((w) => w.balance >= bill.amount);
      if (fundable) {
        insights.push({
          type: 'bill_tip',
          severity: 'low',
          title: `Bayar "${bill.title}" lebih awal`,
          description: `Jatuh tempo ${daysUntilDue === 0 ? 'hari ini' : `dalam ${daysUntilDue} hari`}. Dompet "${fundable.name}" cukup untuk melunasinya sekarang.`,
        });
      } else {
        insights.push({
          type: 'bill_tip',
          severity: 'medium',
          title: `Siapkan dana "${bill.title}"`,
          description: `Jatuh tempo ${daysUntilDue === 0 ? 'hari ini' : `dalam ${daysUntilDue} hari`}, tapi belum ada dompet dengan saldo yang cukup.`,
        });
      }
      if (insights.length >= 8) break;
    }

    // Skor kesehatan keuangan (0-100): savings ratio, budget compliance, beban hutang
    const income = Number((summaryRes[0] as { income: number })?.income ?? 0);
    const expense = Number((summaryRes[0] as { expense: number })?.expense ?? 0);
    const totalBudgets = Number((budgetRes[0] as { total: number })?.total ?? 0);
    const totalPayable = Number((debtRes[0] as { total_payable: number })?.total_payable ?? 0);

    const savingsScore = income > 0 ? Math.min(100, Math.max(0, ((income - expense) / income) * 100)) : income === 0 && expense === 0 ? 50 : 0;
    // Budget compliance diasumsikan baik (100) bila user tidak memakai anggaran.
    const activeBudgetCount = totalBudgets; // over-budget count
    const budgetScore = activeBudgetCount === 0 ? 100 : Math.max(0, 100 - activeBudgetCount * 20);
    // Beban hutang: skala 100 (hutang lunas) turun proporsional terhadap income 3 bulan estimasi.
    const debtScore = income > 0 ? Math.max(0, 100 - (totalPayable / (income * 6)) * 100) : totalPayable > 0 ? 0 : 100;

    const healthScore = Math.round(savingsScore * 0.4 + budgetScore * 0.3 + debtScore * 0.3);
    const condition: InsightsData['health']['condition'] =
      healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'warning' : 'critical';

    const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => order[a.severity] - order[b.severity]);

    const data: InsightsData = {
      month,
      year,
      health: { score: healthScore, condition },
      insights: insights.slice(0, 3),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error, 'insights:get');
  }
}
