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

    // Query transaksi harus index-aware: pakai rentang tanggal, bukan EXTRACT() per baris.
    // Gagal sub-query = gagal total (gagal keras): app keuangan TIDAK boleh menampilkan angka Rp0 palsu.
    const [wRes, cRes, tRes, bRes, billRes, totBalRes, summaryRes, pendingRes, overRes, setRes, debtsRes] =
      await Promise.all([
        query(`SELECT * FROM wallets WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]),
        query(`SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]),
        query(
          `SELECT
             t.id, t.user_id, t.type, t.amount, t.admin_fee,
             t.category_id, t.wallet_id, t.to_wallet_id,
             t.description, t.date, t.created_at, t.updated_at, t.edited_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             w1.name as wallet_name, w1.icon as wallet_icon,
             w2.name as to_wallet_name
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
           LEFT JOIN wallets w1 ON t.wallet_id = w1.id AND w1.user_id = t.user_id
           LEFT JOIN wallets w2 ON t.to_wallet_id = w2.id AND w2.user_id = t.user_id
           WHERE t.user_id = $1
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           ORDER BY t.date DESC, t.created_at DESC`,
          [uid, month, year]
        ),
        query(
          `WITH latest_budgets AS (
             SELECT DISTINCT ON (category_id)
               id, user_id, category_id, monthly_limit, month, year, created_at
             FROM budgets
             WHERE user_id = $1
               AND (year < $3 OR (year = $3 AND month <= $2))
             ORDER BY category_id, year DESC, month DESC
           )
           SELECT
             b.id, b.user_id, b.category_id, b.monthly_limit, $2::smallint as month, $3::smallint as year, b.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
             (b.monthly_limit - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
             CASE
               WHEN b.monthly_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / b.monthly_limit * 100)::NUMERIC, 1)::FLOAT
               ELSE 0
             END as percentage
           FROM latest_budgets b
           JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN transactions t
             ON t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.user_id = b.user_id
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           GROUP BY b.id, b.user_id, b.category_id, b.monthly_limit, b.created_at,
                    c.name, c.icon, c.color
           ORDER BY percentage DESC, b.monthly_limit DESC`,
          [uid, month, year]
        ),
        query(
          `SELECT
             b.id, b.user_id, COALESCE(b.type, 'expense') as type, b.title, b.amount, b.due_day, b.category_id,
             b.wallet_id, COALESCE(b.auto_record, FALSE) as auto_record, b.is_active, b.created_at,
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
        ),
        query(`SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1`, [uid]),
        query(
          `SELECT
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense,
             COALESCE(SUM(CASE WHEN type='transfer' THEN amount ELSE 0 END), 0) as transfer,
             COALESCE(SUM(admin_fee), 0) as admin_total
           FROM transactions
           WHERE user_id = $1
             AND date >= make_date($3::int, $2::int, 1)
             AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'`,
          [uid, month, year]
        ),
        query(
          `SELECT 
             COUNT(*)::text as count,
             COALESCE(SUM(b.amount), 0)::text as total_pending_amount
            FROM recurring_bills b
            LEFT JOIN bill_payments bp
              ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
            WHERE b.user_id = $1 AND b.is_active = TRUE AND COALESCE(b.type, 'expense') = 'expense' AND bp.id IS NULL`,
          [uid, month, year]
        ),
        query(
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
             SELECT b.id, b.monthly_limit
             FROM latest_budgets b
             LEFT JOIN transactions t
               ON t.category_id = b.category_id AND t.type = 'expense'
               AND t.user_id = b.user_id
               AND t.date >= make_date($3::int, $2::int, 1)
               AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
             GROUP BY b.id, b.monthly_limit
             HAVING COALESCE(SUM(t.amount), 0) > b.monthly_limit
           ) over_budgets`,
          [uid, month, year]
        ),
        query(`SELECT * FROM app_settings WHERE user_id = $1`, [uid]),
        query(
          `SELECT
             id, user_id, type, category, person_name,
             total_amount::float AS total_amount,
             paid_amount::float AS paid_amount,
             (total_amount - paid_amount)::float AS remaining_amount,
             principal_amount::float AS principal_amount,
             interest_rate::float AS interest_rate,
             interest_type,
             tenor_months,
             monthly_installment::float AS monthly_installment,
             total_interest::float AS total_interest,
             due_date, notes, status,
             CASE
               WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
               ELSE NULL
             END AS days_until_due,
             CASE
               WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
               ELSE FALSE
             END AS is_overdue,
             CASE
               WHEN status != 'paid' AND (due_date IS NULL OR due_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month') THEN TRUE
               ELSE FALSE
             END AS is_due_this_period,
             created_at, updated_at
           FROM debts
           WHERE user_id = $1
           ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`,
          [uid]
        ),
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
      type: 'expense' | 'income';
      title: string;
      amount: string;
      due_day: number;
      category_id: string | null;
      category_name: string | null;
      wallet_id: string | null;
      wallet_name: string | null;
      auto_record: boolean;
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
        type: b.type === 'income' ? 'income' : 'expense',
        title: b.title,
        amount: parseFloat(b.amount),
        due_day: b.due_day,
        category_id: b.category_id,
        category_name: b.category_name,
        wallet_id: b.wallet_id,
        wallet_name: b.wallet_name,
        auto_record: Boolean(b.auto_record),
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
      is_due_this_period?: boolean;
      created_at: string;
      updated_at: string;
    }

    const formattedDebts = debtsRes as unknown as DebtRow[];

    // Kewajiban/aset masuk "due" hanya bila jatuh tempo bulan ini, terlewat, atau tak terjadwal.
    // Hutang tenor panjang (KPR) yang jadwalnya bulan-bulan depan TIDAK menekan safe-to-spend di sini
    // (beban cicilannya sudah terhitung lewat tagihan rutin bila user mengaktifkan auto-schedule).
    let totalPayableDue = 0;
    let totalReceivableDue = 0;
    let payableUnpaidCount = 0;
    let receivableUnpaidCount = 0;

    for (const d of formattedDebts) {
      if (d.status !== 'paid') {
        const isDueNow = d.is_due_this_period === true;
        if (d.type === 'payable') {
          payableUnpaidCount++;
          if (isDueNow) {
            totalPayableDue += d.remaining_amount;
          }
        } else {
          receivableUnpaidCount++;
          if (isDueNow) {
            totalReceivableDue += d.remaining_amount;
          }
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
