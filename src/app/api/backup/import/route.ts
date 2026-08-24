import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const backupWallet = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'bank', 'ewallet', 'savings']),
  balance: z.number().finite().min(0, 'Backup memuat saldo dompet negatif dan ditolak'),
  icon: z.string().max(50).default('wallet'),
  color: z.string().max(20).default('teal'),
  is_default: z.boolean().default(false),
  sort_order: z.number().int().min(-32768).max(32767).default(0),
});

const backupCategory = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['expense', 'income']),
  icon: z.string().max(50).default('tag'),
  color: z.string().max(20).default('gray'),
});

const backupTransaction = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().finite().positive(),
  admin_fee: z.number().finite().min(0).default(0),
  category_id: z.string().uuid().nullable().optional(),
  wallet_id: z.string().uuid(),
  to_wallet_id: z.string().uuid().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  date: dateStr,
});

const backupBudget = z.object({
  category_id: z.string().uuid(),
  monthly_limit: z.number().finite().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const backupBill = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(150),
  amount: z.number().finite().positive(),
  due_day: z.number().int().min(1).max(31),
  category_id: z.string().uuid().nullable().optional(),
  wallet_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

const backupPayment = z.object({
  bill_id: z.string().uuid(),
  paid_date: dateStr,
  amount: z.number().finite().min(0),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const backupSchema = z.object({
  data: z.object({
    wallets: z.array(backupWallet).max(200).default([]),
    categories: z.array(backupCategory).max(500).default([]),
    transactions: z.array(backupTransaction).max(20000).default([]),
    budgets: z.array(backupBudget).max(2000).default([]),
    recurring_bills: z.array(backupBill).max(500).default([]),
    bill_payments: z.array(backupPayment).max(20000).default([]),
    settings: z
      .object({
        family_name: z.string().min(1).max(100),
        currency: z.string().regex(/^[A-Z]{3}$/).default('IDR'),
      })
      .partial({ currency: true })
      .optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await readJsonBody(req);
    const parsed = backupSchema.parse(body);
    const d = parsed.data;
    const uid = session.userId;

    const result = await withTransaction(async (client) => {
      // Hapus data milik user ini saja, urutan anak -> orang tua.
      await client.query('DELETE FROM bill_payments WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM recurring_bills WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM budgets WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM categories WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM app_settings WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM wallets WHERE user_id = $1', [uid]);

      // Wallet: SELALU generate id baru milik session; id dari payload diabaikan.
      const walletMap = new Map<string, string>();
      let defaultAssigned = false;
      for (const w of d.wallets) {
        const makeDefault = w.is_default && !defaultAssigned;
        if (makeDefault) defaultAssigned = true;
        const inserted = await client.query(
          `INSERT INTO wallets (user_id, name, type, balance, icon, color, is_default, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [uid, w.name, w.type, w.balance.toFixed(2), w.icon, w.color, makeDefault, w.sort_order]
        );
        walletMap.set(w.id, inserted.rows[0].id as string);
      }

      const categoryMap = new Map<string, string>();
      for (const c of d.categories) {
        const inserted = await client.query(
          `INSERT INTO categories (user_id, name, type, icon, color)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [uid, c.name, c.type, c.icon, c.color]
        );
        categoryMap.set(c.id, inserted.rows[0].id as string);
      }

      for (const t of d.transactions) {
        const walletId = walletMap.get(t.wallet_id);
        if (!walletId) throw new BusinessError('Backup memuat transaksi pada dompet yang tidak ada di daftar wallet.');
        const toWalletId = t.to_wallet_id ? walletMap.get(t.to_wallet_id) : null;
        if (t.to_wallet_id && !toWalletId) throw new BusinessError('Backup memuat transfer ke dompet yang tidak dikenal.');
        const categoryId = t.category_id ? categoryMap.get(t.category_id) ?? null : null;
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [uid, t.type, t.amount.toFixed(2), t.admin_fee.toFixed(2), categoryId, walletId, toWalletId, t.description ?? null, t.date]
        );
      }

      for (const b of d.budgets) {
        const categoryId = categoryMap.get(b.category_id);
        if (!categoryId) throw new BusinessError('Backup memuat anggaran dengan kategori yang tidak dikenal.');
        await client.query(
          `INSERT INTO budgets (user_id, category_id, monthly_limit, month, year)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, category_id, month, year) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit`,
          [uid, categoryId, b.monthly_limit.toFixed(2), b.month, b.year]
        );
      }

      const billMap = new Map<string, string>();
      for (const b of d.recurring_bills) {
        const categoryId = b.category_id ? categoryMap.get(b.category_id) ?? null : null;
        const walletId = b.wallet_id ? walletMap.get(b.wallet_id) ?? null : null;
        const inserted = await client.query(
          `INSERT INTO recurring_bills (user_id, title, amount, due_day, category_id, wallet_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [uid, b.title, b.amount.toFixed(2), b.due_day, categoryId, walletId, b.is_active]
        );
        billMap.set(b.id, inserted.rows[0].id as string);
      }

      let restoredPayments = 0;
      const seenPeriods = new Set<string>();
      for (const p of d.bill_payments) {
        const billId = billMap.get(p.bill_id);
        if (!billId) continue; // payment tanpa tagihan induk yang valid tidak bisa dipulihkan
        const key = `${billId}:${p.month}:${p.year}`;
        if (seenPeriods.has(key)) continue; // hormati constraint UNIQUE(user, bill, bulan, tahun)
        seenPeriods.add(key);
        await client.query(
          `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uid, billId, p.paid_date, p.amount.toFixed(2), p.month, p.year]
        );
        restoredPayments++;
      }

      if (d.settings?.family_name) {
        await client.query(
          `INSERT INTO app_settings (user_id, family_name, currency, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id) DO UPDATE SET family_name = EXCLUDED.family_name, currency = EXCLUDED.currency, updated_at = NOW()`,
          [uid, d.settings.family_name, d.settings.currency ?? 'IDR']
        );
      }

      return {
        wallets: walletMap.size,
        categories: categoryMap.size,
        transactions: d.transactions.length,
        bills: billMap.size,
        bill_payments: restoredPayments,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Data berhasil dipulihkan dari file backup.',
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'backup:import');
  }
}
