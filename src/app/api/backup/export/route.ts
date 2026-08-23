import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const [wallets, categories, transactions, budgets, bills, billPayments, settings] = await Promise.all([
      query('SELECT * FROM wallets WHERE user_id = $1', [session.userId]),
      query('SELECT * FROM categories WHERE user_id = $1', [session.userId]),
      query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date ASC', [session.userId]),
      query('SELECT * FROM budgets WHERE user_id = $1', [session.userId]),
      query('SELECT * FROM recurring_bills WHERE user_id = $1', [session.userId]),
      query('SELECT * FROM bill_payments WHERE user_id = $1', [session.userId]),
      query('SELECT * FROM app_settings WHERE user_id = $1', [session.userId]),
    ]);

    const backupData = {
      version: '1.0',
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
      },
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const filename = `Backup-Keuangan-${session.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Backup export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
