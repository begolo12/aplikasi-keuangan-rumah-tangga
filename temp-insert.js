const fs = require('fs');

const content = fs.readFileSync('src/app/api/init/route.ts', 'utf8');

// Pattern to match after goal_contributions closing
const pattern = /(\s+CREATE INDEX IF NOT EXISTS idx_goal_contributions_user ON goal_contributions\(user_id\);\s+\`;\))/;

const match = content.match(pattern);

if (match) {
  const subscriptionTable = `
  // Subscription tracking untuk langganan berulang (Netflix, Spotify, dll)
  await client.query(\`
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
  \`);`;

  const newIndex = match.index + match[0].length;
  const newContent = content.substring(0, newIndex) + subscriptionTable + content.substring(newIndex);
  
  fs.writeFileSync('src/app/api/init/route.ts', newContent, 'utf8');
  console.log('Done - inserted subscriptions table');
} else {
  console.log('No match found');
}
