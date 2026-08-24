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

import { query } from '../src/lib/db';

async function main() {
  console.log('Inspecting columns of table "transactions" in live Neon DB...');
  const cols = await query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'transactions' 
     ORDER BY ordinal_position`
  );
  console.log('Columns in transactions table:', cols);

  // Check wallets columns and constraints
  const walletCols = await query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'wallets' 
     ORDER BY ordinal_position`
  );
  console.log('Columns in wallets table:', walletCols);
}

main().catch(console.error);
