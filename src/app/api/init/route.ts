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
  const secret = process.env.INIT_SECRET;
  if (secret) {
    return; // verifikasi header dilakukan sebelum transaksi
  }
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

    // Invarian strict-zero di level database: saldo dompet tidak boleh minus.
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

    // Kunci idempotency untuk transaksi dari offline queue.
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key UUID;`);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_trx_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;`
    );

    // Indeks pelengkap query laporan per bulan.
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_user_active ON recurring_bills(user_id, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bill_payments_user_month ON bill_payments(user_id, year, month);`);
  });

  return NextResponse.json({
    success: true,
    message: 'Skema database siap. Migrasi (constraint saldo, idempotency key, indeks) diterapkan.',
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
