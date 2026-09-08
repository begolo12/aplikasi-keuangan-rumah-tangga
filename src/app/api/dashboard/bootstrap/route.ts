import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';
import { BUDGET_ROLLOVER_CTE, BUDGET_EFFECTIVE_LIMIT_SQL } from '@/lib/budgetSql';

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
        query(
          `SELECT * FROM wallets
           WHERE user_id = $1
           OR (is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))
           ORDER BY sort_order ASC, name ASC`,
          [uid]
        ),
        query(`SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]),
        query(
          `SELECT
             t.id, t.user_id, t.type, t.amount, t.admin_fee,
             t.category_id, t.wallet_id, t.to_wallet_id,
             t.description, t.date, t.created_at, t.updated_at, t.edited_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             w1.name as wallet_name, w1.icon as wallet_icon,
             w2.name as to_wallet_name,
             CASE WHEN t.user_id = $1 THEN NULL ELSE u.name END as recorder_name
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
           LEFT JOIN wallets w1 ON t.wallet_id = w1.id AND (w1.user_id = $1 OR (w1.is_shared = TRUE AND w1.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           LEFT JOIN wallets w2 ON t.to_wallet_id = w2.id AND (w2.user_id = t.user_id OR (w2.is_shared = TRUE AND w2.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           LEFT JOIN users u ON t.user_id = u.id
           WHERE (
             t.user_id = $1
             OR t.wallet_id IN (
               SELECT id FROM wallets
                WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)
             )
           )
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           ORDER BY t.date DESC, t.created_at DESC`,
          [uid, month, year]
        ),
        query(
          `WITH latest_budgets AS (
             SELECT DISTINCT ON (category_id)
               id, user_id, category_id, monthly_limit, rollover_enabled, month, year, created_at
             FROM budgets
             WHERE user_id = $1
               AND (year < $3 OR (year = $3 AND month <= $2))
             ORDER BY category_id, year DESC, month DESC
           ),
           ${BUDGET_ROLLOVER_CTE}
           SELECT
             b.id, b.user_id, b.category_id, b.monthly_limit, $2::smallint as month, $3::smallint as year, b.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             (CASE WHEN COALESCE(b.rollover_enabled, FALSE) THEN COALESCE(pb.monthly_limit, 0) - COALESCE(ps.spent, 0) ELSE 0 END)::NUMERIC as rollover_amount,
             ${BUDGET_EFFECTIVE_LIMIT_SQL}::NUMERIC as effective_limit,
             COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
             (${BUDGET_EFFECTIVE_LIMIT_SQL} - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
             CASE
               WHEN ${BUDGET_EFFECTIVE_LIMIT_SQL} > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / ${BUDGET_EFFECTIVE_LIMIT_SQL} * 100)::NUMERIC, 1)::FLOAT
               ELSE 0
             END as percentage
           FROM latest_budgets b
           JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN prev_budgets pb ON pb.category_id = b.category_id
           LEFT JOIN prev_spent ps ON ps.category_id = b.category_id
           LEFT JOIN transactions t
             ON t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.user_id = b.user_id
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           GROUP BY b.id, b.user_id, b.category_id, b.monthly_limit, b.rollover_enabled, b.created_at,
                    c.name, c.icon, c.color, pb.monthly_limit, ps.spent
           ORDER BY percentage DESC, b.monthly_limit DESC`,
          [uid, month, year]
        ),
        query(
          `SELECT
             b.id, b.user_id, COALESCE(b.type, 'expense') as type, b.title, b.amount, b.due_day, b.category_id,
             b.wallet_id, b.to_wallet_id, b.debt_id, COALESCE(b.auto_record, FALSE) as auto_record, b.is_active, b.created_at,
             c.name as category_name,
             w.name as wallet_name,
             w2.name as to_wallet_name,
             d.person_name as debt_person_name,
             bp.id as payment_id, bp.paid_date,
             CASE WHEN bp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid
           FROM recurring_bills b
           LEFT JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN wallets w ON b.wallet_id = w.id AND w.user_id = b.user_id
           LEFT JOIN wallets w2 ON b.to_wallet_id = w2.id AND w2.user_id = b.user_id
           LEFT JOIN debts d ON b.debt_id = d.id AND d.user_id = b.user_id
           LEFT JOIN bill_payments bp
             ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
           WHERE b.user_id = $1 AND b.is_active = TRUE
           ORDER BY is_paid ASC, b.due_day ASC`,
          [uid, month, year]
        ),
        query(`SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1 OR (is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))`, [uid]),
        query(
          `SELECT
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense,
             COALESCE(SUM(CASE WHEN type='transfer' THEN amount ELSE 0 END), 0) as transfer,
             COALESCE(SUM(admin_fee), 0) as admin_total
           FROM transactions
           WHERE (
             user_id = $1
             OR wallet_id IN (
               SELECT id FROM wallets
                WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)
             )
           )
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
                 id, user_id, category_id, monthly_limit, rollover_enabled, month, year
               FROM budgets
               WHERE user_id = $1
                 AND (year < $3 OR (year = $3 AND month <= $2))
               ORDER BY category_id, year DESC, month DESC
             ),
             ${BUDGET_ROLLOVER_CTE}
             SELECT b.id, ${BUDGET_EFFECTIVE_LIMIT_SQL} AS effective_limit, COALESCE(SUM(t.amount), 0) AS spent
             FROM latest_budgets b
             LEFT JOIN prev_budgets pb ON pb.category_id = b.category_id
             LEFT JOIN prev_spent ps ON ps.category_id = b.category_id
             LEFT JOIN transactions t
               ON t.category_id = b.category_id AND t.type = 'expense'
               AND t.user_id = b.user_id
               AND t.date >= make_date($3::int, $2::int, 1)
               AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
             GROUP BY b.id, b.monthly_limit, b.rollover_enabled, pb.monthly_limit, ps.spent
           ) over_budgets
           WHERE over_budgets.spent > over_budgets.effective_limit`,
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
            (SELECT COUNT(*) FROM recurring_bills rb WHERE rb.debt_id = debts.id AND rb.is_active = TRUE)::text AS active_bills_count,
             total_interest::float AS total_interest,
             start_date, due_date, notes, status,
             CASE
               WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
               ELSE NULL
             END AS days_until_due,
             CASE
               WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
               ELSE FALSE
             END AS is_overdue,
             CASE
                WHEN status != 'paid' AND (due_date IS NULL OR (due_date >= make_date($3::int, $2::int, 1) AND due_date < make_date($3::int, $2::int, 1) + INTERVAL '1 month')) THEN TRUE
               ELSE FALSE
             END AS is_due_this_period,
             created_at, updated_at
           FROM debts
           WHERE user_id = $1
           ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`,
          [uid, month, year]
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
      type: 'expense' | 'income' | 'transfer';
      title: string;
      amount: string;
      due_day: number;
      category_id: string | null;
      category_name: string | null;
      wallet_id: string | null;
      wallet_name: string | null;
      to_wallet_id: string | null;
      to_wallet_name: string | null;
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
        type: b.type === 'income' ? 'income' : b.type === 'transfer' ? 'transfer' : 'expense',
        title: b.title,
        amount: parseFloat(b.amount),
        due_day: b.due_day,
        category_id: b.category_id,
        category_name: b.category_name,
        wallet_id: b.wallet_id,
        wallet_name: b.wallet_name,
        to_wallet_id: b.to_wallet_id,
        to_wallet_name: b.to_wallet_name,
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
      rollover_enabled: Boolean(b.rollover_enabled),
      rollover_amount: parseFloat(String(b.rollover_amount ?? '0')),
      effective_limit: parseFloat(String(b.effective_limit ?? b.monthly_limit)),
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
      start_date?: string | null;
      due_date: string | null;
      notes: string | null;
      status: 'unpaid' | 'partial' | 'paid';
      days_until_due: number | null;
      is_overdue: boolean;
      is_due_this_period?: boolean;
      monthly_installment?: number | null;
      active_bills_count?: number;
      created_at: string;
      updated_at: string;
    }

    const formattedDebts = debtsRes as unknown as DebtRow[];

    // Kewajiban/aset masuk "due" hanya bila jatuh tempo bulan ini, terlewat, atau tak terjadwal.
    // Hutang yang sudah memiliki tagihan rutin aktif TIDAK dihitung ganda di totalPayableDue.
    // Hutang cicilan tanpa tagihan rutin hanya menghitung cicilan bulanannya, bukan seluruh pokok puluhan tahun.
    let totalPayableDue = 0;
    let totalReceivableDue = 0;
    let payableUnpaidCount = 0;
    let receivableUnpaidCount = 0;

    for (const d of formattedDebts) {
      if (d.status !== 'paid') {
        const isDueNow = d.is_due_this_period === true;
        const hasActiveBill = ((d as unknown as { active_bills_count?: number | string }).active_bills_count ? parseInt(String((d as unknown as { active_bills_count?: number | string }).active_bills_count), 10) : 0) > 0;

        if (d.type === 'payable') {
          payableUnpaidCount++;
          if (isDueNow && !hasActiveBill) {
            const dueAmount = d.monthly_installment && d.monthly_installment > 0
              ? Math.min(d.remaining_amount, d.monthly_installment)
              : d.remaining_amount;
            totalPayableDue += dueAmount;
          }
        } else {
          receivableUnpaidCount++;
          if (isDueNow) {
            const dueAmount = d.monthly_installment && d.monthly_installment > 0
              ? Math.min(d.remaining_amount, d.monthly_installment)
              : d.remaining_amount;
            totalReceivableDue += dueAmount;
          }
        }
      }
    }

    // Safe-to-Spend = Saldo Kas Riil - (Tagihan Pending + Hutang Jatuh Tempo) + Piutang Masuk
    const safeToSpend = totalBalance - (totalBillsPendingAmount + totalPayableDue) + totalReceivableDue;

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
