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
    // Pencabutan sesi JWT: token lama tanpa kolom ini tetap valid (tv 0).
    console.log('1a. Adding token_version column to users...');
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;`);
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

      ALTER TABLE debts
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'hutang_pribadi',
      ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(6,2),
      ADD COLUMN IF NOT EXISTS interest_type VARCHAR(20) DEFAULT 'flat',
      ADD COLUMN IF NOT EXISTS tenor_months INTEGER,
      ADD COLUMN IF NOT EXISTS monthly_installment NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS total_interest NUMERIC(15,2);

      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
    `);

    // 3a. Relasi tagihan cicilan ke hutang sumbernya (setelah tabel debts dibuat di langkah 3).
    console.log('3a. Adding debt_id column to recurring_bills...');
    await client.query(`
      ALTER TABLE recurring_bills
      ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recurring_bills_debt ON recurring_bills(debt_id);`);

    // 3c. Tagihan rutin tipe transfer: dompet tujuan (amplop/target tabungan).
    console.log('3c. Adding to_wallet_id to recurring_bills...');
    await client.query(`
      ALTER TABLE recurring_bills
      ADD COLUMN IF NOT EXISTS to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
    `);

    // 3d. Rollover anggaran per kategori.
    console.log('3d. Adding rollover_enabled to budgets...');
    await client.query(`
      ALTER TABLE budgets
      ADD COLUMN IF NOT EXISTS rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // 3e. Web Push: subscription per perangkat (endpoint unik).
    console.log('3e. Ensuring push_subscriptions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint   TEXT NOT NULL UNIQUE,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
    `);

    // 3b. Savings goals (target tabungan) + riwayat kontribusi
    console.log('3b. Ensuring savings_goals and goal_contributions tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          VARCHAR(80) NOT NULL,
        target_amount NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
        target_date   DATE,
        wallet_id     UUID REFERENCES wallets(id) ON DELETE SET NULL,
        notes         TEXT,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id, is_active);

      CREATE TABLE IF NOT EXISTS goal_contributions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id        UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
        amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        date           DATE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (transaction_id)
      );
      CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON goal_contributions(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goal_contributions_user ON goal_contributions(user_id);
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

    // 6. Tabel rumah tangga (multi-user) + keanggotaan
    console.log('6. Ensuring households and household_members tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS households (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL,
        owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invite_code   VARCHAR(8) NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (owner_user_id),
        UNIQUE (invite_code)
      );

      CREATE TABLE IF NOT EXISTS household_members (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role         VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
        joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id),
        UNIQUE (household_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
    `);

    // 6a. Dompet bersama rumah tangga & dompet tertaut target tabungan
    console.log('6a. Adding household_id, is_shared, linked_goal_id to wallets...');
    await client.query(`
      ALTER TABLE wallets
      ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_wallets_household ON wallets(household_id);
      CREATE INDEX IF NOT EXISTS idx_wallets_linked_goal ON wallets(linked_goal_id);
    `);

    // 6b. Pembelajaran merchant -> kategori
    console.log('6b. Ensuring merchant_category_map table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchant_category_map (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        merchant_name  VARCHAR(150) NOT NULL,
        category_id    UUID REFERENCES categories(id) ON DELETE CASCADE,
        correct_count  INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
        override_count INTEGER NOT NULL DEFAULT 0 CHECK (override_count >= 0),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, merchant_name)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_map_user ON merchant_category_map(user_id);
    `);

    // 6c. Log kirim Web Push anti-duplikat (sebelumnya dibuat lazy oleh cron)
    console.log('6c. Ensuring push_send_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_send_log (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind       TEXT NOT NULL,
        sent_date  DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, kind, sent_date)
      );
    `);

    // 6d. Langganan: kolom yang dipakai aplikasi (provider_name, reminder_enabled, auto_debit).
    console.log('6d. Adding provider_name, reminder_enabled, auto_debit to subscriptions...');
    await client.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS provider_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS auto_debit BOOLEAN NOT NULL DEFAULT FALSE,
      ALTER COLUMN provider DROP NOT NULL;
      UPDATE subscriptions SET provider_name = provider WHERE provider_name IS NULL AND provider IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_cycle ON subscriptions(cycle);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_active_next ON subscriptions(is_active, next_charge_date);
    `);

    // 6e. Dompet tipe 'envelope' (amplop anggaran)
    console.log('6e. Allowing envelope wallet type...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'wallets_type_check'
            AND conrelid = 'wallets'::regclass
            AND pg_get_constraintdef(oid) LIKE '%envelope%'
        ) THEN
          ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_type_check;
          ALTER TABLE wallets ADD CONSTRAINT wallets_type_check
            CHECK (type IN ('cash','bank','ewallet','savings','envelope'));
        END IF;
      END
      $$;
    `);
  });

  console.log('\nSemua migrasi berhasil dijalankan.');

  // Verifikasi keras: migrasi dianggap gagal bila ada kolom/tabel yang belum siap.
  // Tanpa ini, "sukses" hanya berarti SQL tidak melempar error — bukan berarti
  // skema benar-benar cocok dengan yang dibaca aplikasi (lihat insiden provider_name).
  const requiredColumns: Array<[string, string]> = [
    ['subscriptions', 'provider_name'],
    ['subscriptions', 'reminder_enabled'],
    ['subscriptions', 'auto_debit'],
    ['recurring_bills', 'debt_id'],
    ['recurring_bills', 'to_wallet_id'],
    ['recurring_bills', 'asset_id'],
    ['recurring_bills', 'auto_record'],
    ['budgets', 'rollover_enabled'],
    ['users', 'token_version'],
    ['debts', 'start_date'],
    ['wallets', 'household_id'],
    ['wallets', 'is_shared'],
    ['wallets', 'linked_goal_id'],
    ['transactions', 'idempotency_key'],
    ['transactions', 'asset_id'],
    ['transactions', 'edited_at'],
  ];

  const requiredTables = [
    'push_send_log',
    'push_subscriptions',
    'households',
    'household_members',
    'merchant_category_map',
    'budgets_templates',
    'financial_events',
  ];

  const missing: string[] = [];

  for (const [table, column] of requiredColumns) {
    const found = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (found.length === 0) missing.push(`${table}.${column}`);
  }

  for (const table of requiredTables) {
    const found = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    if (found.length === 0) missing.push(`tabel ${table}`);
  }

  // Kolom warisan `provider` harus sudah nullable agar INSERT dari aplikasi tidak gagal.
  const providerCol = await query<{ is_nullable: string }>(
    `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'provider'`
  );
  if (providerCol.length > 0 && providerCol[0].is_nullable !== 'YES') {
    missing.push('subscriptions.provider masih NOT NULL');
  }

  if (missing.length > 0) {
    console.error('\n❌ VERIFIKASI MIGRASI GAGAL. Objek berikut belum siap:');
    for (const m of missing) console.error(`   - ${m}`);
    process.exit(1);
  }

  console.log(`✅ Verifikasi lulus: ${requiredColumns.length} kolom + ${requiredTables.length} tabel siap.`);
}

main().catch((err) => {
  console.error('Migration Error:', err);
  process.exit(1);
});
