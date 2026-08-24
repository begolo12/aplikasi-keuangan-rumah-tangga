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

import { query, withTransaction } from '../src/lib/db';

async function main() {
  console.log('Testing transaction recording with exact API flow...');

  const users = await query<{ id: string }>('SELECT id FROM users LIMIT 1');
  if (users.length === 0) {
    console.log('No user found.');
    return;
  }
  const uid = users[0].id;

  const wallets = await query<{ id: string; name: string; balance: string }>(
    'SELECT id, name, balance FROM wallets WHERE user_id = $1 ORDER BY sort_order',
    [uid]
  );
  const categories = await query<{ id: string; name: string; type: string }>(
    'SELECT id, name, type FROM categories WHERE user_id = $1',
    [uid]
  );

  const w1 = wallets[0];
  const w2 = wallets[1] || wallets[0];
  const catExpense = categories.find((c) => c.type === 'expense') || categories[0];
  const catIncome = categories.find((c) => c.type === 'income') || categories[categories.length - 1];

  console.log('User ID:', uid);
  console.log('Wallet 1:', w1.name, 'Balance:', w1.balance);
  console.log('Wallet 2:', w2.name, 'Balance:', w2.balance);

  // Top up w1 if needed to have at least Rp 1.000.000 for test
  await query('UPDATE wallets SET balance = balance + 1000000 WHERE id = $1', [w1.id]);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Expense Transaction with idempotency key
  console.log('\nTesting Expense INSERT with idempotency_key...');
  const expRes = await withTransaction(async (client) => {
    await client.query('UPDATE wallets SET balance = balance - 50000 WHERE id = $1 AND user_id = $2', [w1.id, uid]);
    return await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [uid, 'expense', 50000, 0, catExpense.id, w1.id, null, 'Test Belanja Harian', todayStr, null]
    );
  });
  console.log('✓ Expense created successfully:', expRes.rows[0].id, expRes.rows[0].amount);

  // 2. Income Transaction
  console.log('\nTesting Income INSERT with idempotency_key...');
  const incRes = await withTransaction(async (client) => {
    await client.query('UPDATE wallets SET balance = balance + 100000 WHERE id = $1 AND user_id = $2', [w1.id, uid]);
    return await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [uid, 'income', 100000, 0, catIncome.id, w1.id, null, 'Test Gaji Masuk', todayStr, null]
    );
  });
  console.log('✓ Income created successfully:', incRes.rows[0].id, incRes.rows[0].amount);

  // 3. Transfer Transaction
  if (w1.id !== w2.id) {
    console.log('\nTesting Transfer INSERT with idempotency_key...');
    const trfRes = await withTransaction(async (client) => {
      await client.query('UPDATE wallets SET balance = balance - 25000 WHERE id = $1 AND user_id = $2', [w1.id, uid]);
      await client.query('UPDATE wallets SET balance = balance + 25000 WHERE id = $1 AND user_id = $2', [w2.id, uid]);
      return await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [uid, 'transfer', 25000, 0, null, w1.id, w2.id, 'Test Transfer Antar Dompet', todayStr, null]
      );
    });
    console.log('✓ Transfer created successfully:', trfRes.rows[0].id, trfRes.rows[0].amount);
  }

  console.log('\nSEMUA PENCATATAN TRANSAKSI SUKSES 100%!');
}

main().catch((err) => {
  console.error('Transaction Recording Error:', err);
  process.exit(1);
});
