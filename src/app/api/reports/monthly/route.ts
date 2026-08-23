import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { MonthlySummary } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);

    // 1. Total wallet balance
    const walletBalanceRow = await query<{ total: string }>(
      'SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1',
      [session.userId]
    );
    const totalBalance = parseFloat(walletBalanceRow[0]?.total || '0');

    // 2. Total Income and Total Expense (transfers excluded from net cash flow)
    const incomeRow = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'income' 
         AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [session.userId, month, year]
    );
    const totalIncome = parseFloat(incomeRow[0]?.total || '0');

    const expenseRow = await query<{ total: string; admin_total: string }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total,
        COALESCE(SUM(admin_fee), 0) as admin_total
       FROM transactions 
       WHERE user_id = $1 
         AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [session.userId, month, year]
    );
    const totalExpense = parseFloat(expenseRow[0]?.total || '0') + parseFloat(expenseRow[0]?.admin_total || '0');

    const transferRow = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'transfer' 
         AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [session.userId, month, year]
    );
    const totalTransfer = parseFloat(transferRow[0]?.total || '0');

    const netCashFlow = totalIncome - totalExpense;

    // 3. Pending recurring bills count for this month
    const pendingBillsRow = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM recurring_bills b
       LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
       WHERE b.user_id = $1 AND b.is_active = TRUE AND bp.id IS NULL`,
      [session.userId, month, year]
    );
    const billPendingCount = parseInt(pendingBillsRow[0]?.count || '0', 10);

    // 4. Overbudget count
    const overbudgetRow = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM (
         SELECT b.id, b.monthly_limit, COALESCE(SUM(t.amount), 0) as spent
         FROM budgets b
         LEFT JOIN transactions t ON t.category_id = b.category_id 
           AND t.type = 'expense'
           AND t.user_id = b.user_id
           AND EXTRACT(MONTH FROM t.date) = b.month
           AND EXTRACT(YEAR FROM t.date) = b.year
         WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
         GROUP BY b.id, b.monthly_limit
         HAVING COALESCE(SUM(t.amount), 0) > b.monthly_limit
       ) over_budgets`,
      [session.userId, month, year]
    );
    const budgetOverCount = parseInt(overbudgetRow[0]?.count || '0', 10);

    // 5. Daily cashflow breakdown for the month
    const dailyRows = await query<{ day: number; income: string; expense: string }>(
      `SELECT 
        EXTRACT(DAY FROM date)::INTEGER as day,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::TEXT as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) + SUM(admin_fee), 0)::TEXT as expense
       FROM transactions
       WHERE user_id = $1 
         AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
       GROUP BY EXTRACT(DAY FROM date)
       ORDER BY day ASC`,
      [session.userId, month, year]
    );

    const summary: MonthlySummary = {
      month,
      year,
      total_balance: totalBalance,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_cash_flow: netCashFlow,
      total_transfer: totalTransfer,
      bill_pending_count: billPendingCount,
      budget_over_count: budgetOverCount,
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
  } catch (error: any) {
    console.error('Get monthly report error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
