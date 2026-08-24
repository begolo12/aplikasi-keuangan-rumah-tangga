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
  console.log('Testing DB connection...');
  const res = await query('SELECT NOW() as now');
  console.log('Connected to DB at:', res[0]);

  const tables = await query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log('Existing tables in DB:', tables.map((t) => t.table_name));

  const hasDebts = tables.some((t) => t.table_name === 'debts');
  console.log('Has debts table:', hasDebts);

  if (!hasDebts) {
    console.log('Creating debts and debt_payments tables...');
    await withTransaction(async (client) => {
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
    });
    console.log('Debts tables created successfully!');
  }

  const users = await query('SELECT id, name, email FROM users');
  console.log('Users in DB count:', users.length, users);
}

main().catch((err) => {
  console.error('DB Error:', err);
  process.exit(1);
});
