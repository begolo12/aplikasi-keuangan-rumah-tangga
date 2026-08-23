import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const backup = await req.json();
    if (!backup || !backup.data) {
      return NextResponse.json({ success: false, error: 'Format file backup tidak valid.' }, { status: 400 });
    }

    const { wallets, categories, transactions, budgets, recurring_bills, bill_payments, settings } = backup.data;

    await withTransaction(async (client) => {
      // Clear current user data
      await client.query('DELETE FROM bill_payments WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM recurring_bills WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM budgets WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM categories WHERE user_id = $1', [session.userId]);
      await client.query('DELETE FROM wallets WHERE user_id = $1', [session.userId]);

      // Restore Wallets
      if (Array.isArray(wallets)) {
        for (const w of wallets) {
          await client.query(
            `INSERT INTO wallets (id, user_id, name, type, balance, icon, color, is_default, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance`,
            [w.id, session.userId, w.name, w.type, w.balance, w.icon, w.color, w.is_default, w.sort_order || 0]
          );
        }
      }

      // Restore Categories
      if (Array.isArray(categories)) {
        for (const c of categories) {
          await client.query(
            `INSERT INTO categories (id, user_id, name, type, icon, color, is_default, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [c.id, session.userId, c.name, c.type, c.icon, c.color, c.is_default, c.sort_order || 0]
          );
        }
      }

      // Restore Transactions
      if (Array.isArray(transactions)) {
        for (const t of transactions) {
          await client.query(
            `INSERT INTO transactions (id, user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [t.id, session.userId, t.type, t.amount, t.admin_fee || 0, t.category_id, t.wallet_id, t.to_wallet_id, t.description, t.date]
          );
        }
      }

      // Restore Budgets
      if (Array.isArray(budgets)) {
        for (const b of budgets) {
          await client.query(
            `INSERT INTO budgets (id, user_id, category_id, monthly_limit, month, year)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, category_id, month, year) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit`,
            [b.id, session.userId, b.category_id, b.monthly_limit, b.month, b.year]
          );
        }
      }

      // Restore Recurring Bills
      if (Array.isArray(recurring_bills)) {
        for (const rb of recurring_bills) {
          await client.query(
            `INSERT INTO recurring_bills (id, user_id, title, amount, due_day, category_id, wallet_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [rb.id, session.userId, rb.title, rb.amount, rb.due_day, rb.category_id, rb.wallet_id, rb.is_active]
          );
        }
      }

      // Restore Bill Payments
      if (Array.isArray(bill_payments)) {
        for (const bp of bill_payments) {
          await client.query(
            `INSERT INTO bill_payments (id, user_id, bill_id, paid_date, amount, month, year)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, bill_id, month, year) DO NOTHING`,
            [bp.id, session.userId, bp.bill_id, bp.paid_date, bp.amount, bp.month, bp.year]
          );
        }
      }

      // Restore Settings
      if (settings && settings.family_name) {
        await client.query(
          `INSERT INTO app_settings (user_id, family_name, currency)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE SET family_name = EXCLUDED.family_name, currency = EXCLUDED.currency`,
          [session.userId, settings.family_name, settings.currency || 'IDR']
        );
      }
    });

    return NextResponse.json({ success: true, message: 'Data berhasil dipulihkan dari file backup.' });
  } catch (error: any) {
    console.error('Backup import error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memulihkan backup' }, { status: 500 });
  }
}
