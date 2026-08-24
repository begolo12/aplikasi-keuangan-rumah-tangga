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

import { withTransaction, query } from '../src/lib/db';

async function main() {
  console.log('Running comprehensive migration against Neon live DB...');

  await withTransaction(async (client) => {
    // 1. Ensure idempotency_key column in transactions
    console.log('1. Adding idempotency_key column to transactions...');
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key UUID;`);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_trx_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;`
    );

    // 2. Strict-zero balance constraint in wallets
    console.log('2. Ensuring wallets_balance_nonnegative constraint...');
    await client.query(`UPDATE wallets SET balance = 0 WHERE balance < 0;`);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_balance_nonnegative') THEN
          ALTER TABLE wallets ADD CONSTRAINT wallets_balance_nonnegative CHECK (balance >= 0);
        END IF;
      END
      $$;
    `);

    // 3. Ensure debts & debt_payments tables
    console.log('3. Ensuring debts and debt_payments tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type             VARCHAR(20) NOT NULL CHECK (type IN ('payable','receivable')),
        person_name      VARCHAR(100) NOT NULL,
        total_amount     NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
        paid_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
        due_date         DATE,
        notes            TEXT,
        status           VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_debts_user_type ON debts(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_debts_user_due ON debts(user_id, due_date);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        debt_id      UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_id    UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
        amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_user ON debt_payments(user_id);
    `);

    // 4. Index optimizations
    console.log('4. Adding auxiliary indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_user_active ON recurring_bills(user_id, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bill_payments_user_month ON bill_payments(user_id, year, month);`);
  });

  console.log('\nAll migrations executed successfully!');

  // Verify columns now
  const cols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY ordinal_position`
  );
  console.log('Transactions columns now:', cols.map((c) => c.column_name));
}

main().catch((err) => {
  console.error('Migration Error:', err);
  process.exit(1);
});
