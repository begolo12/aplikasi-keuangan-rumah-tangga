import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    // 1. Extensions
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Users Table
    await query(`
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

    // 3. Wallets Table
    await query(`
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

    // 4. Categories Table
    await query(`
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

    // 5. Transactions Table
    await query(`
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

    // 6. Budgets Table
    await query(`
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

    // 7. Recurring Bills Table
    await query(`
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

    // 8. Bill Payments Table
    await query(`
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

    // 9. App Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_name   VARCHAR(100) DEFAULT 'Keluarga Bahagia',
        currency      VARCHAR(10) DEFAULT 'IDR',
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    return NextResponse.json({
      success: true,
      message: 'Database schema and all tables initialized successfully on Neon Postgres.',
    });
  } catch (error: any) {
    console.error('Init error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Database initialization failed' },
      { status: 500 }
    );
  }
}
