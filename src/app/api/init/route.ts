import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';

type Client = Parameters<Parameters<typeof withTransaction>[0]>[0];

/**
 * Init hanya boleh:
 * 1. Dipanggil dengan header X-Init-Secret yang cocok dengan INIT_SECRET env, ATAU
 * 2. Menyelesaikan bootstrap pertama saat database masih kosong (belum ada tabel users / user terdaftar).
 * Setelah produksi berjalan, endpoint terkunci tanpa secret.
 */
async function assertInitAllowed(client: Client): Promise<void> {
  const tables = await client.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS has_users`
  );
  if (!tables.rows[0].has_users) {
    return; // database belum diinisialisasi: bootstrap pertama diizinkan
  }
  const counted = await client.query('SELECT COUNT(*)::int AS total FROM users');
  if (counted.rows[0].total > 0) {
    throw new BusinessError('Database sudah berisi data. Inisialisasi ulang butuh header X-Init-Secret.', 403);
  }
}

async function initializeSchema(req: NextRequest): Promise<NextResponse> {
  const session = await getAuthSession(req);
  const secret = process.env.INIT_SECRET;
  const authorizedBySecret = Boolean(secret) && req.headers.get('x-init-secret') === secret;
  // User yang sudah login (pemilik aplikasi) tetap boleh menjalankan migrasi ringan.
  if (!authorizedBySecret && !session) {
    try {
      await withTransaction(async (client) => {
        await assertInitAllowed(client);
      });
    } catch {
      return NextResponse.json(
        { success: false, error: 'Inisialisasi membutuhkan login atau header X-Init-Secret.' },
        { status: 403 }
      );
    }
  }

  await withTransaction(async (client) => {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        family_name   VARCHAR(100) DEFAULT 'Keluarga Bahagia',
        avatar_url    VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        type         VARCHAR(50) NOT NULL CHECK (type IN ('cash','bank','ewallet','savings')),
        balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
        icon         VARCHAR(50) NOT NULL DEFAULT 'wallet',
        color        VARCHAR(20) NOT NULL DEFAULT 'teal',
        is_default   BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order   SMALLINT NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR(100) NOT NULL,
        type       VARCHAR(20) NOT NULL CHECK (type IN ('expense','income')),
        icon       VARCHAR(50) NOT NULL,
        color      VARCHAR(20) NOT NULL DEFAULT 'gray',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order SMALLINT NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type            VARCHAR(20) NOT NULL CHECK (type IN ('expense','income','transfer')),
        amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        admin_fee       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (admin_fee >= 0),
        category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
        wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
        to_wallet_id    UUID REFERENCES wallets(id) ON DELETE RESTRICT,
        description     TEXT,
        date            DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_trx_user_date ON transactions(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_trx_user_wallet ON transactions(user_id, wallet_id);
      CREATE INDEX IF NOT EXISTS idx_trx_user_category ON transactions(user_id, category_id);
      CREATE INDEX IF NOT EXISTS idx_trx_user_type_date ON transactions(user_id, type, date);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        monthly_limit  NUMERIC(15,2) NOT NULL CHECK (monthly_limit > 0),
        month          SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year           SMALLINT NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, category_id, month, year)
      );
      CREATE INDEX IF NOT EXISTS idx_budgets_user_my ON budgets(user_id, month, year);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_bills (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title          VARCHAR(150) NOT NULL,
        amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        due_day        SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
        category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
        wallet_id      UUID REFERENCES wallets(id) ON DELETE SET NULL,
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_bills_user ON recurring_bills(user_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bill_payments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bill_id      UUID NOT NULL REFERENCES recurring_bills(id) ON DELETE CASCADE,
        paid_date    DATE NOT NULL DEFAULT CURRENT_DATE,
        amount       NUMERIC(15,2) NOT NULL,
        month        SMALLINT NOT NULL,
        year         SMALLINT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, bill_id, month, year)
      );
      CREATE INDEX IF NOT EXISTS idx_bill_payments_user ON bill_payments(user_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_name   VARCHAR(100) DEFAULT 'Keluarga Bahagia',
        currency      VARCHAR(10) DEFAULT 'IDR',
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

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
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
      CREATE INDEX IF NOT EXISTS idx_assets_user_category ON assets(user_id, category);
    `);

    // ---- Migrasi inkremental (idempoten) ----

    // Dukung saldo minus (overdraft): lepas batasan non-negatif jika sebelumnya ada.
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_balance_nonnegative') THEN
          ALTER TABLE wallets DROP CONSTRAINT wallets_balance_nonnegative;
        END IF;
      END
      $$;
    `);

    // Kolom detail hutang (KPR, bunga, tenor, cicilan) pada tabel debts
    await client.query(`
      ALTER TABLE debts
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'hutang_pribadi',
      ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(6,2),
      ADD COLUMN IF NOT EXISTS interest_type VARCHAR(20) DEFAULT 'flat',
      ADD COLUMN IF NOT EXISTS tenor_months INTEGER,
      ADD COLUMN IF NOT EXISTS monthly_installment NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS total_interest NUMERIC(15,2);
    `);

    // Kolom penjualan aset di tabel assets
    await client.query(`
      ALTER TABLE assets
      ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sold_date DATE,
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS gain_loss NUMERIC(15,2);
    `);

    // Kolom rekonsiliasi saldo riil pada tabel wallets
    await client.query(`
      ALTER TABLE wallets
      ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_reconciled_balance NUMERIC(15,2);
    `);

    // Kolom type dan auto_record serta asset_id untuk recurring_bills (transaksi rutin pemasukan & pengeluaran pasti)
    await client.query(`
      ALTER TABLE recurring_bills 
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'expense',
      ADD COLUMN IF NOT EXISTS auto_record BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
    `);

    // Kolom asset_id dan idempotency_key pada transactions
    await client.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS idempotency_key UUID,
      ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
    `);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_trx_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;`
    );

    // Target tabungan (savings goals) + riwayat kontribusinya
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

    // ---- Tabel yang sebelumnya hanya dibuat lewat migrasi manual ----

    // Rumah tangga (multi-user) + keanggotaannya
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

    // Pembelajaran merchant -> kategori dari koreksi pengguna
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

    // Web Push: langganan per perangkat + log anti-kirim-ganda
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint   TEXT NOT NULL,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (endpoint)
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

      CREATE TABLE IF NOT EXISTS push_send_log (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind       TEXT NOT NULL,
        sent_date  DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, kind, sent_date)
      );
    `);

    // ---- Kolom yang hilang ----

    // Pencabutan sesi JWT (logout paksa). Token lama tanpa kolom ini tetap valid (tv 0).
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;`);

    // Dompet bersama rumah tangga & dompet yang tertaut ke target tabungan.
    await client.query(`
      ALTER TABLE wallets
      ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_wallets_household ON wallets(household_id);
      CREATE INDEX IF NOT EXISTS idx_wallets_linked_goal ON wallets(linked_goal_id);
    `);

    // Rollover anggaran per kategori (sisa bulan lalu dibawa ke bulan berikutnya).
    await client.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);

    // Tanggal mulai hutang, dipakai untuk menghitung cicilan berjalan.
    await client.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS start_date DATE;`);

    // Tagihan rutin yang berasal dari hutang, dan dompet tujuan untuk tipe transfer.
    await client.query(`
      ALTER TABLE recurring_bills
      ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_recurring_bills_debt ON recurring_bills(debt_id);
    `);

    // Dompet tipe 'envelope' (amplop anggaran) dipakai modul target tabungan & tagihan.
    // Hanya dijalankan bila constraint belum mengenal 'envelope', supaya tidak
    // membuang-ulang constraint (yang berarti lock + validasi ulang seluruh tabel) tiap init.
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

    // Subscription tracking untuk langganan berulang (Netflix, Spotify, dll)
  await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider        VARCHAR(100) NOT NULL,
        amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        cycle           VARCHAR(20) NOT NULL CHECK (cycle IN ('daily','weekly','monthly','yearly')),
        next_charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
        category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
        wallet_id       UUID REFERENCES wallets(id) ON DELETE SET NULL,
        notes           TEXT,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_cycle ON subscriptions(cycle);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_active_next ON subscriptions(is_active, next_charge_date);
    `);

    // Kolom yang dipakai aplikasi & UI: `provider_name` + `reminder_enabled`.
    // Tabel warisan hanya punya `provider`, jadi tambahkan kolom baru lalu salin isinya.
    // `provider` tetap ada (longgarkan NOT NULL-nya) supaya INSERT dari aplikasi tidak gagal.
    await client.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS provider_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ALTER COLUMN provider DROP NOT NULL;
      UPDATE subscriptions SET provider_name = provider WHERE provider_name IS NULL AND provider IS NOT NULL;
    `);

    // Budget templates: pre-defined templates per user untuk quick-start budgeting.
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets_templates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name            VARCHAR(100) NOT NULL,
        description     TEXT,
        rule_type       VARCHAR(50) NOT NULL CHECK (rule_type IN ('50_30_20', 'zero_based', 'custom')),
        is_default      BOOLEAN NOT NULL DEFAULT FALSE,
        allocations     JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_budgets_templates_user ON budgets_templates(user_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_templates_default ON budgets_templates(is_default) WHERE is_default = TRUE;
    `);

    // Indeks pelengkap query laporan per bulan.
    // Financial calendar events: bonus, insurance renewal, tax deadline, investment contributions
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_events (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title                VARCHAR(150) NOT NULL,
        type                 VARCHAR(50) NOT NULL CHECK (type IN ('bonus', 'insurance_renewal', 'tax_deadline', 'investment_contribution')),
        date                 DATE NOT NULL DEFAULT CURRENT_DATE,
        amount               NUMERIC(15,2),
        description          TEXT,
        recurrence_rule      VARCHAR(255),
        notification_days_before INTEGER NOT NULL DEFAULT 1,
        is_active            BOOLEAN NOT NULL DEFAULT TRUE,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_events_user_date ON financial_events(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_events_user_active ON financial_events(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_events_user_active_date ON financial_events(user_id, is_active, date ASC);
      CREATE INDEX IF NOT EXISTS idx_events_month_year 
      ON financial_events(user_id, (EXTRACT(YEAR FROM date)::INT), (EXTRACT(MONTH FROM date)::INT)) 
      WHERE is_active = TRUE;
    `);
    
    // Trigger untuk updated_at otomatis
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_financial_events_updated_at ON financial_events;
      CREATE TRIGGER update_financial_events_updated_at
        BEFORE UPDATE ON financial_events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Indeks pelengkap query laporan per bulan.
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_user_active ON recurring_bills(user_id, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bill_payments_user_month ON bill_payments(user_id, year, month);`);
  });

  return NextResponse.json({
    success: true,
    message: 'Skema database siap. Migrasi (saldo minus, recurring type/auto_record, idempotency key, rumah tangga, web push, langganan, indeks) diterapkan.',
  });
}

export async function GET(req: NextRequest) {
  try {
    return await initializeSchema(req);
  } catch (error) {
    return handleRouteError(error, 'init:get');
  }
}

export async function POST(req: NextRequest) {
  try {
    return await initializeSchema(req);
  } catch (error) {
    return handleRouteError(error, 'init:post');
  }
}

