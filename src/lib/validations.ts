import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
  family_name: z.string().max(100).optional().default('Keluarga Bahagia'),
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const walletSchema = z.object({
  name: z.string().min(1, 'Nama dompet wajib diisi').max(100),
  type: z.enum(['cash', 'bank', 'ewallet', 'savings']),
  balance: z.number().min(0, 'Saldo awal tidak boleh negatif').default(0),
  icon: z.string().default('wallet'),
  color: z.string().default('teal'),
  is_default: z.boolean().default(false),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(100),
  type: z.enum(['expense', 'income']),
  icon: z.string().min(1, 'Ikon kategori wajib dipilih'),
  color: z.string().default('gray'),
});

export const transactionSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().positive('Nominal transaksi harus lebih dari 0'),
  admin_fee: z.number().min(0, 'Biaya admin tidak boleh negatif').default(0),
  category_id: z.string().uuid().optional().nullable(),
  wallet_id: z.string().uuid('Pilih dompet asal yang valid'),
  to_wallet_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
}).refine((data) => {
  if (data.type === 'transfer') {
    if (!data.to_wallet_id) return false;
    if (data.wallet_id === data.to_wallet_id) return false;
  }
  return true;
}, {
  message: 'Dompet tujuan transfer wajib dipilih dan tidak boleh sama dengan dompet asal',
  path: ['to_wallet_id'],
});

export const budgetSchema = z.object({
  category_id: z.string().uuid('Pilih kategori yang valid'),
  monthly_limit: z.number().positive('Batas anggaran harus lebih dari 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const recurringBillSchema = z.object({
  title: z.string().min(1, 'Nama tagihan wajib diisi').max(150),
  amount: z.number().positive('Nominal tagihan harus lebih dari 0'),
  due_day: z.number().int().min(1).max(31, 'Tanggal jatuh tempo harus antara 1 sampai 31'),
  category_id: z.string().uuid().optional().nullable(),
  wallet_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const payBillSchema = z.object({
  wallet_id: z.string().uuid('Pilih dompet untuk pembayaran'),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  amount: z.number().positive('Nominal pembayaran harus lebih dari 0').optional(),
});

export const settingsSchema = z.object({
  family_name: z.string().min(1, 'Nama keluarga wajib diisi').max(100),
  currency: z.string().default('IDR'),
});
