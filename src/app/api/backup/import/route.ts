import { getLocalDateString } from '@/lib/formatters';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { checkRateLimit } from '@/lib/rateLimit';
import { getMembership } from '@/lib/household';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const backupWallet = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'bank', 'ewallet', 'savings', 'envelope']),
  balance: z.number().finite(),
  icon: z.string().max(50).default('wallet'),
  color: z.string().max(20).default('teal'),
  is_default: z.boolean().default(false),
  sort_order: z.number().int().min(-32768).max(32767).default(0),
  is_shared: z.boolean().default(false),
  household_id: z.string().uuid().nullable().optional(),
  linked_goal_id: z.string().uuid().nullable().optional(),
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
  id: z.string().uuid().optional(),
  asset_id: z.string().uuid().nullable().optional(),
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
  type: z.enum(['expense', 'income', 'transfer']).default('expense'),
  to_wallet_id: z.string().uuid().nullable().optional(),
  debt_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
  auto_record: z.boolean().default(false),
});

const backupPayment = z.object({
  bill_id: z.string().uuid(),
  paid_date: dateStr,
  amount: z.number().finite().min(0),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const backupAsset = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: z.enum(['kendaraan', 'elektronik', 'properti', 'perhiasan_emas', 'alat_usaha', 'lainnya']),
  purchase_date: dateStr,
  purchase_price: z.number().finite().positive(),
  current_value: z.number().finite().min(0).optional().nullable(),
  depreciation_method: z.enum(['straight_line', 'declining_balance', 'none']).default('straight_line'),
  useful_life_years: z.number().int().min(1).max(100).default(5),
  salvage_value: z.number().finite().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  is_sold: z.boolean().default(false),
  sold_date: dateStr.optional().nullable(),
  selling_price: z.number().finite().positive().optional().nullable(),
  gain_loss: z.number().finite().optional().nullable(),
});

const backupDebt = z.object({
  id: z.string().uuid(),
  type: z.enum(['payable', 'receivable']),
  category: z.enum(['kpr_rumah', 'kredit_kendaraan', 'pinjaman_bank', 'hutang_pribadi', 'lainnya']).optional().nullable(),
  person_name: z.string().min(1).max(100),
  total_amount: z.number().finite().positive(),
  paid_amount: z.number().finite().min(0).default(0),
  principal_amount: z.number().finite().positive().optional().nullable(),
  interest_rate: z.number().finite().min(0).optional().nullable(),
  interest_type: z.enum(['flat', 'effective', 'none']).optional().nullable(),
  tenor_months: z.number().int().positive().optional().nullable(),
  monthly_installment: z.number().finite().positive().optional().nullable(),
  total_interest: z.number().finite().min(0).optional().nullable(),
  due_date: dateStr.optional().nullable(),
  start_date: dateStr.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(['unpaid', 'partial', 'paid']).default('unpaid'),
}).refine((debt) => (debt.paid_amount ?? 0) <= debt.total_amount, 'paid_amount tidak boleh melebihi total_amount');

const backupDebtPayment = z.object({
  id: z.string().uuid().optional(),
  debt_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  amount: z.number().finite().positive(),
  payment_date: dateStr,
  notes: z.string().max(500).optional().nullable(),
});

const backupGoal = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  target_amount: z.number().finite().positive(),
  target_date: dateStr.optional().nullable(),
  wallet_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

const backupGoalContribution = z.object({
  id: z.string().uuid().optional(),
  goal_id: z.string().uuid(),
  transaction_id: z.string().uuid().optional().nullable(),
  amount: z.number().finite().positive(),
  date: dateStr.optional().nullable(),
});

const backupSchema = z.object({
  data: z.object({
    wallets: z.array(backupWallet).max(200).default([]),
    categories: z.array(backupCategory).max(500).default([]),
    transactions: z.array(backupTransaction).max(20000).default([]),
    budgets: z.array(backupBudget).max(2000).default([]),
    recurring_bills: z.array(backupBill).max(500).default([]),
    bill_payments: z.array(backupPayment).max(20000).default([]),
    assets: z.array(backupAsset).max(1000).default([]),
    debts: z.array(backupDebt).max(1000).default([]),
    debt_payments: z.array(backupDebtPayment).max(20000).default([]),
    savings_goals: z.array(backupGoal).max(500).default([]),
    goal_contributions: z.array(backupGoalContribution).max(20000).default([]),
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

    // Operasi destruktif: batasi 5x per jam per user (anti klik-ganda/loop).
    const rl = checkRateLimit(`backup-import:${uid}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Terlalu banyak pemulihan data. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }

    // Keanggotaan saat ini: dompet bersama hanya dipulihkan bila household-nya masih sama.
    const membership = await getMembership(uid);
    const pendingGoalLinks: { walletId: string; goalOldId: string }[] = [];
    const result = await withTransaction(async (client) => {
      // Hapus data milik user ini saja, urutan anak -> orang tua (FK cascade-aware).
      await client.query('DELETE FROM goal_contributions WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM savings_goals WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM debt_payments WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM debts WHERE user_id = $1', [uid]);
      await client.query(
        `DELETE FROM recurring_bills WHERE user_id = $1 AND asset_id IS NOT NULL`,
        [uid]
      );
      await client.query('DELETE FROM bill_payments WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM recurring_bills WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM budgets WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM assets WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM categories WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM app_settings WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM wallets WHERE user_id = $1', [uid]);

      // Wallet: SELALU generate id baru milik session; id dari payload diabaikan.
      const walletMap = new Map<string, string>();
      let defaultAssigned = false;
      for (const w of d.wallets) {
        const makeDefault = w.is_default && !defaultAssigned;
        if (makeDefault) defaultAssigned = true;
        // Turunkan jadi dompet pribadi bila household backup sudah tidak sama.
        const keepShared = w.is_shared && w.household_id && membership && w.household_id === membership.household_id;
        const inserted = await client.query(
          `INSERT INTO wallets (user_id, name, type, balance, icon, color, is_default, sort_order, is_shared, household_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [uid, w.name, w.type, w.balance.toFixed(2), w.icon, w.color, makeDefault, w.sort_order, keepShared ? true : false, keepShared ? w.household_id : null]
        );
        const newWalletId = String(inserted.rows[0]?.id ?? '');
        walletMap.set(w.id, newWalletId);
        if (w.linked_goal_id) pendingGoalLinks.push({ walletId: newWalletId, goalOldId: w.linked_goal_id });
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

      // Assets (sebelum transactions karena transactions.asset_id nullable)
      const assetMap = new Map<string, string>();
      for (const a of d.assets) {
        const inserted = await client.query(
          `INSERT INTO assets (user_id, name, category, purchase_date, purchase_price, current_value, depreciation_method, useful_life_years, salvage_value, notes, is_sold, sold_date, selling_price, gain_loss)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
          [
            uid,
            a.name,
            a.category,
            a.purchase_date,
            a.purchase_price.toFixed(2),
            (a.current_value ?? a.purchase_price).toFixed(2),
            a.depreciation_method,
            a.useful_life_years,
            a.salvage_value.toFixed(2),
            a.notes ?? null,
            a.is_sold,
            a.sold_date ?? null,
            a.selling_price != null ? a.selling_price.toFixed(2) : null,
            a.gain_loss != null ? a.gain_loss.toFixed(2) : null,
          ]
        );
        assetMap.set(a.id, inserted.rows[0].id as string);
      }

      // Debts
      const debtMap = new Map<string, string>();
      for (const debt of d.debts) {
        const inserted = await client.query(
          `INSERT INTO debts (user_id, type, category, person_name, total_amount, paid_amount, principal_amount, interest_rate, interest_type, tenor_months, monthly_installment, total_interest, due_date, start_date, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
          [
            uid,
            debt.type,
            debt.category ?? 'hutang_pribadi',
            debt.person_name,
            debt.total_amount.toFixed(2),
            (debt.paid_amount ?? 0).toFixed(2),
            debt.principal_amount != null ? debt.principal_amount.toFixed(2) : null,
            debt.interest_rate ?? null,
            debt.interest_type ?? 'flat',
            debt.tenor_months ?? null,
            debt.monthly_installment != null ? debt.monthly_installment.toFixed(2) : null,
            debt.total_interest != null ? debt.total_interest.toFixed(2) : null,
            debt.due_date ?? null,
            debt.start_date ?? null,
            debt.notes ?? null,
            debt.status ?? 'unpaid',
          ]
        );
        debtMap.set(debt.id, inserted.rows[0].id as string);
      }

      const transactionMap = new Map<string, string>();
      for (const t of d.transactions) {
        const walletId = walletMap.get(t.wallet_id);
        if (!walletId) throw new BusinessError('Backup memuat transaksi pada dompet yang tidak ada di daftar wallet.');
        const toWalletId = t.to_wallet_id ? walletMap.get(t.to_wallet_id) : null;
        if (t.to_wallet_id && !toWalletId) throw new BusinessError('Backup memuat transfer ke dompet yang tidak dikenal.');
        const categoryId = t.category_id ? categoryMap.get(t.category_id) ?? null : null;
        const assetId = t.asset_id ? assetMap.get(t.asset_id) ?? null : null;
        const insTrx = await client.query(
          `INSERT INTO transactions (user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, asset_id, description, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [uid, t.type, t.amount.toFixed(2), t.admin_fee.toFixed(2), categoryId, walletId, toWalletId, assetId, t.description ?? null, t.date]
        );
        if (t.id) transactionMap.set(t.id, String(insTrx.rows[0]?.id ?? ''));
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
        const toWalletId = b.to_wallet_id ? walletMap.get(b.to_wallet_id) ?? null : null;
        if (b.to_wallet_id && !toWalletId) throw new BusinessError('Backup memuat tagihan transfer ke dompet yang tidak dikenal.');
        if (b.type === 'transfer' && !toWalletId) throw new BusinessError('Backup memuat tagihan transfer tanpa dompet tujuan.');
        if (toWalletId && walletId && toWalletId === walletId) throw new BusinessError('Backup memuat tagihan transfer dengan dompet asal dan tujuan sama.');
        const debtId = b.debt_id ? debtMap.get(b.debt_id) ?? null : null;
        const assetId = b.asset_id ? assetMap.get(b.asset_id) ?? null : null;
        const inserted = await client.query(
          `INSERT INTO recurring_bills (user_id, type, title, amount, due_day, category_id, wallet_id, to_wallet_id, debt_id, asset_id, auto_record, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [uid, b.type, b.title, b.amount.toFixed(2), b.due_day, categoryId, walletId, toWalletId, debtId, assetId, b.auto_record, b.is_active]
        );
        billMap.set(b.id, String(inserted.rows[0]?.id ?? ''));
      }

      let restoredPayments = 0;
      const seenPeriods = new Set<string>();
      for (const p of d.bill_payments) {
        const billId = billMap.get(p.bill_id);
        if (!billId) continue;
        const key = `${billId}:${p.month}:${p.year}`;
        if (seenPeriods.has(key)) continue;
        seenPeriods.add(key);
        await client.query(
          `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uid, billId, p.paid_date, p.amount.toFixed(2), p.month, p.year]
        );
        restoredPayments++;
      }

      // Debt payments
      let restoredDebtPayments = 0;
      for (const dp of d.debt_payments) {
        const newDebtId = debtMap.get(dp.debt_id);
        const newWalletId = walletMap.get(dp.wallet_id);
        if (!newDebtId || !newWalletId) continue;
        await client.query(
          `INSERT INTO debt_payments (debt_id, user_id, wallet_id, amount, payment_date, notes)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [newDebtId, uid, newWalletId, dp.amount.toFixed(2), dp.payment_date, dp.notes ?? null]
        );
        restoredDebtPayments++;
      }

      // Savings goals
      const goalMap = new Map<string, string>();
      for (const g of d.savings_goals) {
        const newWalletId = g.wallet_id ? walletMap.get(g.wallet_id) ?? null : null;
        const inserted = await client.query(
          `INSERT INTO savings_goals (user_id, name, target_amount, target_date, wallet_id, notes, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [uid, g.name, g.target_amount.toFixed(2), g.target_date ?? null, newWalletId, g.notes ?? null, g.is_active]
        );
        goalMap.set(g.id, inserted.rows[0].id as string);
      }

      // Tautkan ulang dompet penampung ke goal hasil restore (relasi tidak boleh putus).
      for (const link of pendingGoalLinks) {
        const newGoalId = goalMap.get(link.goalOldId);
        if (newGoalId) {
          await client.query('UPDATE wallets SET linked_goal_id = $1 WHERE id = $2 AND user_id = $3', [newGoalId, link.walletId, uid]);
        }
      }

      // Goal contributions: transaction_id ikut di-remap agar jejak audit kas utuh.
      let restoredContribs = 0;
      for (const gc of d.goal_contributions) {
        const newGoalId = goalMap.get(gc.goal_id);
        if (!newGoalId) continue;
        const newTrxId = gc.transaction_id ? transactionMap.get(gc.transaction_id) ?? null : null;
        await client.query(
          `INSERT INTO goal_contributions (goal_id, user_id, transaction_id, amount, date)
           VALUES ($1,$2,$3,$4,$5)`,
          [newGoalId, uid, newTrxId, gc.amount.toFixed(2), gc.date ?? getLocalDateString()]
        );
        restoredContribs++;
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
        assets: assetMap.size,
        debts: debtMap.size,
        debt_payments: restoredDebtPayments,
        savings_goals: goalMap.size,
        goal_contributions: restoredContribs,
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
