import { getLocalDateString } from '@/lib/formatters';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { checkRateLimit } from '@/lib/rateLimit';
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const rl = checkRateLimit(`backup-export:${session.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Terlalu banyak unduhan backup. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }

    const [wallets, categories, transactions, budgets, bills, billPayments, settings, assets, debts, debtPayments, goals, goalContributions] =
      await Promise.all([
        query('SELECT * FROM wallets WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM categories WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date ASC', [session.userId]),
        query('SELECT * FROM budgets WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM recurring_bills WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM bill_payments WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM app_settings WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM assets WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM debts WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM debt_payments WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM savings_goals WHERE user_id = $1', [session.userId]),
        query('SELECT * FROM goal_contributions WHERE user_id = $1', [session.userId]),
      ]);

    const backupData = {
      version: '1.1',
      exported_at: new Date().toISOString(),
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
      },
      data: {
        settings: settings[0] || null,
        wallets,
        categories,
        transactions,
        budgets,
        recurring_bills: bills,
        bill_payments: billPayments,
        assets,
        debts,
        debt_payments: debtPayments,
        savings_goals: goals,
        goal_contributions: goalContributions,
      },
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const filename = `Backup-Keuangan-${session.name.replace(/\s+/g, '_')}-${getLocalDateString()}.json`;

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error, 'backup:export');
  }
}
