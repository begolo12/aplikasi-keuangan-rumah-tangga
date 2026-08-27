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

    // 2. Allow negative balance in wallets (overdraft support)
    console.log('2. Removing wallets_balance_nonnegative constraint to allow negative balance...');
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_balance_nonnegative') THEN
          ALTER TABLE wallets DROP CONSTRAINT wallets_balance_nonnegative;
        END IF;
      END
      $$;
    `);

    // 2a. Add reconciliation columns to wallets
    console.log('2a. Adding reconciliation columns to wallets...');
    await client.query(`
      ALTER TABLE wallets
      ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_reconciled_balance NUMERIC(15,2);
    `);

    // 2b. Add type and auto_record and asset_id to recurring_bills
    console.log('2b. Adding type, auto_record and asset_id to recurring_bills...');
    await client.query(`
      ALTER TABLE recurring_bills 
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'expense',
      ADD COLUMN IF NOT EXISTS auto_record BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
    `);

    // 2c. Add asset_id to transactions
    console.log('2c. Adding asset_id to transactions...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
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

    // 4. Ensure assets table for Asset Management & Depreciation
    console.log('4. Ensuring assets table, disposal columns and indexes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name                 VARCHAR(100) NOT NULL,
        category             VARCHAR(50) NOT NULL CHECK (category IN ('kendaraan','elektronik','properti','perhiasan_emas','alat_usaha','lainnya')),
        purchase_date        DATE NOT NULL,
        purchase_price       NUMERIC(15,2) NOT NULL CHECK (purchase_price > 0),
        current_value        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
        depreciation_method  VARCHAR(30) NOT NULL DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line','declining_balance','none')),
        useful_life_years    SMALLINT NOT NULL DEFAULT 5 CHECK (useful_life_years > 0),
        salvage_value        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
        notes                TEXT,
        is_sold              BOOLEAN NOT NULL DEFAULT FALSE,
        sold_date            DATE,
        selling_price        NUMERIC(15,2),
        gain_loss            NUMERIC(15,2),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE assets
      ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sold_date DATE,
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS gain_loss NUMERIC(15,2);

      CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
      CREATE INDEX IF NOT EXISTS idx_assets_user_category ON assets(user_id, category);
      CREATE INDEX IF NOT EXISTS idx_assets_user_sold ON assets(user_id, is_sold);
    `);

    // 5. Index optimizations
    console.log('5. Adding auxiliary indexes...');
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
