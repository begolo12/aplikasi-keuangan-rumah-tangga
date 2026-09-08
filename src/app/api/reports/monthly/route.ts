import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';
import { MonthlySummary } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const parsed = periodQuerySchema.parse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const month = parsed.month ?? now.getMonth() + 1;
    const year = parsed.year ?? now.getFullYear();
    const uid = session.userId;

    const [
      walletBalanceRows,
      incomeRows,
      expenseRows,
      transferRows,
      pendingBillsRows,
      overbudgetRows,
      dailyRows,
      debtRows,
    ] = await Promise.all([
      query<{ total: string }>('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1 OR (is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))', [uid]),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE (user_id = $1 OR wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))) AND type = 'income'
           AND date >= make_date($3::int, $2::int, 1)
           AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'`,
        [uid, month, year]
      ),
      query<{ total: string; admin_total: string }>(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total,
          COALESCE(SUM(admin_fee), 0) as admin_total
         FROM transactions
         WHERE (user_id = $1 OR wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           AND date >= make_date($3::int, $2::int, 1)
           AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'`,
        [uid, month, year]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE (user_id = $1 OR wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))) AND type = 'transfer'
           AND date >= make_date($3::int, $2::int, 1)
           AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'`,
        [uid, month, year]
      ),
      query<{ count: string; total_pending_amount: string }>(
        `SELECT
           COUNT(*)::text as count,
           COALESCE(SUM(b.amount), 0)::text as total_pending_amount
         FROM recurring_bills b
         LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
         WHERE b.user_id = $1 AND b.is_active = TRUE AND COALESCE(b.type, 'expense') = 'expense' AND bp.id IS NULL`,
        [uid, month, year]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count
         FROM (
           WITH latest_budgets AS (
             SELECT DISTINCT ON (category_id)
               id, user_id, category_id, monthly_limit, month, year
             FROM budgets
             WHERE user_id = $1
               AND (year < $3 OR (year = $3 AND month <= $2))
             ORDER BY category_id, year DESC, month DESC
           )
           SELECT b.id, b.monthly_limit, COALESCE(SUM(t.amount), 0) as spent
           FROM latest_budgets b
           LEFT JOIN transactions t ON t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.user_id = b.user_id
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           GROUP BY b.id, b.monthly_limit
           HAVING COALESCE(SUM(t.amount), 0) > b.monthly_limit
         ) over_budgets`,
        [uid, month, year]
      ),
      query<{ day: number; income: string; expense: string }>(
        `SELECT
          EXTRACT(DAY FROM date)::INTEGER as day,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::TEXT as income,
          (COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) + COALESCE(SUM(admin_fee), 0))::TEXT as expense
         FROM transactions
         WHERE (user_id = $1 OR wallet_id IN (SELECT id FROM wallets WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           AND date >= make_date($3::int, $2::int, 1)
           AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
         GROUP BY EXTRACT(DAY FROM date)
         ORDER BY day ASC`,
        [uid, month, year]
      ),
      query<{ type: string; remaining_amount: string; status: string; due_date: string | null; is_due_this_period: boolean; monthly_installment: string | null; active_bills_count: string }>(
        `SELECT type, (total_amount - paid_amount)::text as remaining_amount, status, due_date,
                monthly_installment::text,
                (SELECT COUNT(*) FROM recurring_bills rb WHERE rb.debt_id = debts.id AND rb.is_active = TRUE)::text AS active_bills_count,
                CASE
                   WHEN status != 'paid' AND (due_date IS NULL OR (due_date >= make_date($3::int, $2::int, 1) AND due_date < make_date($3::int, $2::int, 1) + INTERVAL '1 month')) THEN TRUE
                  ELSE FALSE
                END AS is_due_this_period
         FROM debts
         WHERE user_id = $1 AND status != 'paid'`,
        [uid, month, year]
      ),
    ]);

    const totalBalance = parseFloat(walletBalanceRows[0]?.total || '0');
    const totalIncome = parseFloat(incomeRows[0]?.total || '0');
    const totalExpense = parseFloat(expenseRows[0]?.total || '0') + parseFloat(expenseRows[0]?.admin_total || '0');
    const totalTransfer = parseFloat(transferRows[0]?.total || '0');
    const totalBillsPendingAmount = parseFloat(pendingBillsRows[0]?.total_pending_amount || '0');

    let totalPayableDue = 0;
    let totalReceivableDue = 0;
    let payableUnpaidCount = 0;
    let receivableUnpaidCount = 0;

    for (const d of debtRows) {
      const rem = parseFloat(d.remaining_amount || '0');
      const isDue = d.is_due_this_period;
      const hasActiveBill = parseInt(d.active_bills_count || '0', 10) > 0;
      const inst = d.monthly_installment ? parseFloat(d.monthly_installment) : null;
      const dueAmount = inst && inst > 0 ? Math.min(rem, inst) : rem;

      if (d.type === 'payable') {
        payableUnpaidCount++;
        if (isDue && !hasActiveBill) totalPayableDue += dueAmount;
      } else {
        receivableUnpaidCount++;
        if (isDue) totalReceivableDue += dueAmount;
      }
    }

    const safeToSpend = totalBalance - (totalBillsPendingAmount + totalPayableDue) + totalReceivableDue;

    const summary: MonthlySummary = {
      month,
      year,
      total_balance: totalBalance,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_cash_flow: totalIncome - totalExpense,
      total_transfer: totalTransfer,
      bill_pending_count: parseInt(pendingBillsRows[0]?.count || '0', 10),
      budget_over_count: parseInt(overbudgetRows[0]?.count || '0', 10),
      total_bills_pending_amount: totalBillsPendingAmount,
      total_payable_due: totalPayableDue,
      total_receivable_due: totalReceivableDue,
      safe_to_spend: safeToSpend,
      payable_unpaid_count: payableUnpaidCount,
      receivable_unpaid_count: receivableUnpaidCount,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        daily_trends: dailyRows.map((r) => ({
          day: r.day,
          income: parseFloat(r.income),
          expense: parseFloat(r.expense),
        })),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'reports:monthly');
  }
}
