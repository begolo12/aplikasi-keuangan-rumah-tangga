import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { query } from '../src/lib/db';

async function main() {
  console.log('Testing all dashboard & report SQL queries against live DB...');

  const users = await query<{ id: string }>('SELECT id FROM users LIMIT 1');
  if (users.length === 0) {
    console.log('No users found in DB.');
    return;
  }

  const uid = users[0].id;
  const month = 8;
  const year = 2026;

  console.log('Testing queries for user:', uid);

  const [wRes, cRes, tRes, bRes, billRes, totBalRes, summaryRes, pendingRes, overRes, setRes, debtsRes] =
    await Promise.all([
      query(`SELECT * FROM wallets WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]),
      query(`SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, name ASC`, [uid]),
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
      ),
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
      ),
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
           AND EXTRACT(MONTH FROM date) = $2
           AND EXTRACT(YEAR FROM date) = $3`,
        [uid, month, year]
      ),
      query(
        `SELECT 
           COUNT(*)::text as count,
           COALESCE(SUM(b.amount), 0)::text as total_pending_amount
         FROM recurring_bills b
         LEFT JOIN bill_payments bp
           ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
         WHERE b.user_id = $1 AND b.is_active = TRUE AND bp.id IS NULL`,
        [uid, month, year]
      ),
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
      ),
      query(`SELECT * FROM app_settings WHERE user_id = $1`, [uid]),
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
      ),
    ]);

  console.log('✓ Wallets:', wRes.length);
  console.log('✓ Categories:', cRes.length);
  console.log('✓ Transactions:', tRes.length);
  console.log('✓ Budgets:', bRes.length);
  console.log('✓ Bills:', billRes.length);
  console.log('✓ Total Balance:', totBalRes[0]);
  console.log('✓ Summary:', summaryRes[0]);
  console.log('✓ Pending Bills:', pendingRes[0]);
  console.log('✓ Overbudget:', overRes[0]);
  console.log('✓ Settings:', setRes[0]);
  console.log('✓ Debts:', debtsRes.length);

  console.log('\nSEMUA QUERY BOOTSTRAP LULUS 100% TANPA ERROR!');
}

main().catch((err) => {
  console.error('Query Failure:', err);
  process.exit(1);
});
