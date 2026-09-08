    // Subscriptions: tracking recurring subscription services (Netflix, Spotify, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_name       VARCHAR(150) NOT NULL,
        amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        cycle               VARCHAR(20) NOT NULL CHECK (cycle IN ('daily','weekly','monthly','yearly')),
        next_charge_date    DATE NOT NULL DEFAULT CURRENT_DATE,
        category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
        wallet_id           UUID REFERENCES wallets(id) ON DELETE SET NULL,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        reminder_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_next ON subscriptions(next_charge_date);
    `);
