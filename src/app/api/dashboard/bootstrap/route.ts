import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const uid = user.userId;

    const { searchParams } = req.nextUrl;
    const now = new Date();
    const parsedQuery = periodQuerySchema.safeParse({
      month: searchParams.get('month') || now.getMonth() + 1,
      year: searchParams.get('year') || now.getFullYear(),
    });

    const month = parsedQuery.success && parsedQuery.data.month ? parsedQuery.data.month : now.getMonth() + 1;
    const year = parsedQuery.success && parsedQuery.data.year ? parsedQuery.data.year : now.getFullYear();
    const currentDay = now.getDate();

    const [wRes, cRes, tRes, bRes, billRes, totBalRes, summaryRes, pendingRes, overRes, setRes, debtsRes] =
      await Promise.all([
        query(`SELECT * FROM wallets WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]).catch(() => []),
        query(`SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]).catch(() => []),
        query(
          `SELECT
             t.id, t.user_id, t.type, t.amount, t.admin_fee,
             t.category_id, t.wallet_id, t.to_wallet_id,
             t.description, t.date, t.created_at, t.updated_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             w1.name as wallet_name, w1.icon as wallet_icon,
             w2.name as to_wallet_name
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
           LEFT JOIN wallets w1 ON t.wallet_id = w1.id AND w1.user_id = t.user_id
           LEFT JOIN wallets w2 ON t.to_wallet_id = w2.id AND w2.user_id = t.user_id
           WHERE t.user_id = $1
             AND EXTRACT(MONTH FROM t.date) = $2
             AND EXTRACT(YEAR FROM t.date) = $3
           ORDER BY t.date DESC, t.created_at DESC`,
          [uid, month, year]
        ).catch(() => []),
        query(
          `SELECT
             b.id, b.user_id, b.category_id, b.monthly_limit, b.month, b.year, b.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
             (b.monthly_limit - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
             ROUND((COALESCE(SUM(t.amount), 0) / b.monthly_limit * 100)::NUMERIC, 1)::FLOAT as percentage
           FROM budgets b
           JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN transactions t
             ON t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.user_id = b.user_id
             AND EXTRACT(MONTH FROM t.date) = b.month
             AND EXTRACT(YEAR FROM t.date) = b.year
           WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
           GROUP BY b.id, b.user_id, b.category_id, b.monthly_limit, b.month, b.year, b.created_at,
                    c.name, c.icon, c.color
           ORDER BY percentage DESC, b.monthly_limit DESC`,
          [uid, month, year]
        ).catch(() => []),
        query(
          `SELECT
             b.id, b.user_id, b.title, b.amount, b.due_day, b.category_id,
             b.wallet_id, b.is_active, b.created_at,
             c.name as category_name,
             w.name as wallet_name,
             bp.id as payment_id, bp.paid_date,
             CASE WHEN bp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid
           FROM recurring_bills b
           LEFT JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN wallets w ON b.wallet_id = w.id AND w.user_id = b.user_id
           LEFT JOIN bill_payments bp
             ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
           WHERE b.user_id = $1 AND b.is_active = TRUE
           ORDER BY is_paid ASC, b.due_day ASC`,
          [uid, month, year]
        ).catch(() => []),
        query(`SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1`, [uid]).catch(() => [{ total: '0' }]),
        query(
          `SELECT
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense,
             COALESCE(SUM(CASE WHEN type='transfer' THEN amount ELSE 0 END), 0) as transfer,
             COALESCE(SUM(admin_fee), 0) as admin_total
           FROM transactions
           WHERE user_id = $1
             AND EXTRACT(MONTH FROM date) = $2
             AND EXTRACT(YEAR FROM date) = $3`,
          [uid, month, year]
        ).catch(() => [{ income: '0', expense: '0', transfer: '0', admin_total: '0' }]),
        query(
          `SELECT 
             COUNT(*)::text as count,
             COALESCE(SUM(b.amount), 0)::text as total_pending_amount
           FROM recurring_bills b
           LEFT JOIN bill_payments bp
             ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
           WHERE b.user_id = $1 AND b.is_active = TRUE AND bp.id IS NULL`,
          [uid, month, year]
        ).catch(() => [{ count: '0', total_pending_amount: '0' }]),
        query(
          `SELECT COUNT(*)::text as count
           FROM (
             SELECT b.id
             FROM budgets b
             LEFT JOIN transactions t
               ON t.category_id = b.category_id AND t.type = 'expense'
               AND t.user_id = b.user_id
               AND EXTRACT(MONTH FROM t.date) = b.month
               AND EXTRACT(YEAR FROM t.date) = b.year
             WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
             GROUP BY b.id, b.monthly_limit
             HAVING COALESCE(SUM(t.amount), 0) > b.monthly_limit
           ) over_budgets`,
          [uid, month, year]
        ).catch(() => [{ count: '0' }]),
        query(`SELECT * FROM app_settings WHERE user_id = $1`, [uid]).catch(() => []),
        query(
          `SELECT 
             id, user_id, type, person_name,
             total_amount::float AS total_amount,
             paid_amount::float AS paid_amount,
             (total_amount - paid_amount)::float AS remaining_amount,
             due_date, notes, status,
             CASE 
               WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
               ELSE NULL 
             END AS days_until_due,
             CASE 
               WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
               ELSE FALSE 
             END AS is_overdue,
             created_at, updated_at
           FROM debts
           WHERE user_id = $1
           ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`,
          [uid]
        ).catch(() => []),
      ]);

    const totalBalance = parseFloat((totBalRes[0]?.total as string) || '0');
    const totalIncome = parseFloat((summaryRes[0]?.income as string) || '0');
    const totalExpense =
      parseFloat((summaryRes[0]?.expense as string) || '0') +
      parseFloat((summaryRes[0]?.admin_total as string) || '0');
    const totalTransfer = parseFloat((summaryRes[0]?.transfer as string) || '0');
    const totalBillsPendingAmount = parseFloat((pendingRes[0]?.total_pending_amount as string) || '0');

    interface BillRow {
      id: string;
      user_id: string;
      title: string;
      amount: string;
      due_day: number;
      category_id: string | null;
      category_name: string | null;
      wallet_id: string | null;
      wallet_name: string | null;
      is_active: boolean;
      is_paid: boolean;
      paid_date: string | null;
      created_at: string;
    }
    const formattedBills = (billRes as unknown as BillRow[]).map((b) => {
      const isPaid = Boolean(b.is_paid);
      const daysUntilDue = b.due_day - currentDay;
      let status: string;
      if (isPaid) {
        status = 'paid';
      } else if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue === 0) {
        status = 'due_today';
      } else if (daysUntilDue <= 3) {
        status = 'due_soon';
      } else {
        status = 'upcoming';
      }

      return {
        id: b.id,
        user_id: b.user_id,
        title: b.title,
        amount: parseFloat(b.amount),
        due_day: b.due_day,
        category_id: b.category_id,
        category_name: b.category_name,
        wallet_id: b.wallet_id,
        wallet_name: b.wallet_name,
        is_active: b.is_active,
        is_paid: isPaid,
        paid_date: b.paid_date,
        days_until_due: daysUntilDue,
        status,
        created_at: b.created_at,
      };
    });

    interface BudgetRow {
      id: string;
      user_id: string;
      category_id: string;
      monthly_limit: string;
      month: number;
      year: number;
      created_at: string;
      category_name: string;
      category_icon: string;
      category_color: string;
      spent: string;
      remaining: string;
      percentage: number;
      [key: string]: unknown;
    }
    const formattedBudgets = (bRes as unknown as BudgetRow[]).map((b) => ({
      ...b,
      monthly_limit: parseFloat(b.monthly_limit),
      spent: parseFloat(b.spent),
      remaining: parseFloat(b.remaining),
      percentage: parseFloat(String(b.percentage)),
    }));

    interface WalletRow extends Record<string, unknown> {
      balance: string;
    }
    const formattedWallets = (wRes as unknown as WalletRow[]).map((w) => ({
      ...w,
      balance: parseFloat(w.balance),
    }));

    interface TrxRow extends Record<string, unknown> {
      amount: string;
      admin_fee: string | null;
    }
    const formattedTransactions = (tRes as unknown as TrxRow[]).map((t) => ({
      ...t,
      amount: parseFloat(t.amount),
      admin_fee: parseFloat(t.admin_fee || '0'),
    }));

    interface DebtRow {
      id: string;
      user_id: string;
      type: 'payable' | 'receivable';
      person_name: string;
      total_amount: number;
      paid_amount: number;
      remaining_amount: number;
      due_date: string | null;
      notes: string | null;
      status: 'unpaid' | 'partial' | 'paid';
      days_until_due: number | null;
      is_overdue: boolean;
      created_at: string;
      updated_at: string;
    }

    const formattedDebts = debtsRes as unknown as DebtRow[];

    // Calculate Debts & Receivables Due in current month
    let totalPayableDue = 0;
    let totalReceivableDue = 0;
    let payableUnpaidCount = 0;
    let receivableUnpaidCount = 0;

    for (const d of formattedDebts) {
      if (d.status !== 'paid') {
        if (d.type === 'payable') {
          payableUnpaidCount++;
          // If due this month or no due date / overdue, count towards payable due
          totalPayableDue += d.remaining_amount;
        } else {
          receivableUnpaidCount++;
          totalReceivableDue += d.remaining_amount;
        }
      }
    }

    // Safe-to-Spend = Saldo Kas Riil - (Tagihan Pending + Hutang Jatuh Tempo) + Piutang Masuk
    const safeToSpend = totalBalance - (totalBillsPendingAmount + totalPayableDue);

    return NextResponse.json({
      success: true,
      data: {
        wallets: formattedWallets,
        categories: cRes,
        transactions: formattedTransactions,
        budgets: formattedBudgets,
        bills: formattedBills,
        debts: formattedDebts,
        summary: {
          month,
          year,
          total_balance: totalBalance,
          total_income: totalIncome,
          total_expense: totalExpense,
          net_cash_flow: totalIncome - totalExpense,
          total_transfer: totalTransfer,
          bill_pending_count: parseInt((pendingRes[0]?.count as string) || '0', 10),
          budget_over_count: parseInt((overRes[0]?.count as string) || '0', 10),
          total_bills_pending_amount: totalBillsPendingAmount,
          total_payable_due: totalPayableDue,
          total_receivable_due: totalReceivableDue,
          safe_to_spend: safeToSpend,
          payable_unpaid_count: payableUnpaidCount,
          receivable_unpaid_count: receivableUnpaidCount,
        },
        settings: setRes[0] || null,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'dashboard:bootstrap');
  }
}
