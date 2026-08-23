import { query, withTransaction } from './db';

export const DEFAULT_WALLETS = [
  { name: 'Dompet Tunai', type: 'cash', icon: 'money', color: 'emerald', balance: 500000, is_default: true, sort_order: 1 },
  { name: 'Rekening Bank BCA', type: 'bank', icon: 'bank', color: 'blue', balance: 3500000, is_default: false, sort_order: 2 },
  { name: 'E-Wallet GoPay / OVO', type: 'ewallet', icon: 'device-mobile', color: 'teal', balance: 350000, is_default: false, sort_order: 3 },
  { name: 'Dana Darurat & Tabungan', type: 'savings', icon: 'vault', color: 'amber', balance: 5000000, is_default: false, sort_order: 4 },
];

export const DEFAULT_CATEGORIES = [
  // Pengeluaran
  { name: 'Makanan & Minuman', type: 'expense', icon: 'fork-knife', color: 'orange', sort_order: 1 },
  { name: 'Belanja Pasar & Dapur', type: 'expense', icon: 'shopping-cart', color: 'emerald', sort_order: 2 },
  { name: 'Listrik & Air PDAM', type: 'expense', icon: 'lightning', color: 'amber', sort_order: 3 },
  { name: 'Internet & Pulsa', type: 'expense', icon: 'wifi-high', color: 'blue', sort_order: 4 },
  { name: 'Transportasi & Bensin', type: 'expense', icon: 'gas-pump', color: 'indigo', sort_order: 5 },
  { name: 'Pendidikan & Sekolah', type: 'expense', icon: 'graduation-cap', color: 'teal', sort_order: 6 },
  { name: 'Kesehatan & Obat', type: 'expense', icon: 'first-aid-kit', color: 'rose', sort_order: 7 },
  { name: 'Hiburan & Liburan', type: 'expense', icon: 'film-strip', color: 'purple', sort_order: 8 },
  { name: 'Cicilan & Hutang', type: 'expense', icon: 'credit-card', color: 'red', sort_order: 9 },
  { name: 'Lain-lain', type: 'expense', icon: 'dots-three', color: 'gray', sort_order: 10 },

  // Pemasukan
  { name: 'Gaji Bulanan', type: 'income', icon: 'briefcase', color: 'emerald', sort_order: 1 },
  { name: 'Bonus & THR', type: 'income', icon: 'gift', color: 'amber', sort_order: 2 },
  { name: 'Usaha Sampingan', type: 'income', icon: 'storefront', color: 'blue', sort_order: 3 },
  { name: 'Hasil Investasi', type: 'income', icon: 'trend-up', color: 'purple', sort_order: 4 },
  { name: 'Pemasukan Lainnya', type: 'income', icon: 'wallet', color: 'teal', sort_order: 5 },
];

/**
 * Seed standard wallets, categories, and settings for a newly registered user.
 */
export async function seedUserData(userId: string, familyName: string = 'Keluarga Bahagia'): Promise<void> {
  await withTransaction(async (client) => {
    // 1. App settings
    await client.query(
      `INSERT INTO app_settings (user_id, family_name, currency)
       VALUES ($1, $2, 'IDR')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, familyName]
    );

    // 2. Wallets
    for (const w of DEFAULT_WALLETS) {
      await client.query(
        `INSERT INTO wallets (user_id, name, type, balance, icon, color, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, w.name, w.type, w.balance, w.icon, w.color, w.is_default, w.sort_order]
      );
    }

    // 3. Categories
    for (const c of DEFAULT_CATEGORIES) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, color, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
        [userId, c.name, c.type, c.icon, c.color, c.sort_order]
      );
    }
  });
}
