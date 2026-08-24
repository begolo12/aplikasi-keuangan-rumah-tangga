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
  icon: z.string().min(1, 'Ikon kategori wajib dipilih').max(50),
  color: z.string().max(20).default('gray'),
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
  currency: z.string().regex(/^[A-Z]{3}$/, 'Kode mata uang harus 3 huruf besar (mis. IDR)').default('IDR'),
});

export const uuidIdParam = z.string().uuid('ID tidak valid');

export const periodQuerySchema = z.object({
  month: z.coerce.number().int().min(1, 'Bulan harus 1-12').max(12, 'Bulan harus 1-12').optional(),
  year: z.coerce.number().int().min(2000, 'Tahun tidak wajar').max(2100, 'Tahun tidak wajar').optional(),
});

export const transactionListQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  type: z.enum(['expense', 'income', 'transfer']).optional(),
  wallet_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200, 'Limit maksimal 200').default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const debtSchema = z.object({
  type: z.enum(['payable', 'receivable']),
  person_name: z.string().min(1, 'Nama pihak/orang wajib diisi').max(100),
  total_amount: z.number().positive('Nominal hutang/piutang harus lebih dari 0'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const debtPaymentSchema = z.object({
  wallet_id: z.string().uuid('Pilih dompet untuk transaksi'),
  amount: z.number().positive('Nominal pembayaran harus lebih dari 0'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().max(500).optional().nullable(),
});

export const debtQuerySchema = z.object({
  type: z.enum(['payable', 'receivable']).optional(),
  status: z.enum(['unpaid', 'partial', 'paid']).optional(),
});
