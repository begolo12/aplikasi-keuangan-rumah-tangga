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
  balance: z.number().default(0), // Mendukung saldo negatif / minus
  icon: z.string().default('wallet'),
  color: z.string().default('teal'),
  is_default: z.boolean().default(false),
});

export const reconcileWalletSchema = z.object({
  actual_balance: z.number({ required_error: 'Nominal saldo fisik/rekening riil wajib diisi' }),
  reconcile_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().max(500).optional().nullable(),
  auto_adjust: z.boolean().default(true), // Otomatis buat transaksi penyesuaian
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
  asset_id: z.string().uuid().optional().nullable(),
  create_asset: z.boolean().default(false), // Otomatis catat ke daftar aset jika pembelian barang
  asset_name: z.string().max(100).optional().nullable(),
  asset_category: z.enum(['kendaraan', 'elektronik', 'properti', 'perhiasan_emas', 'alat_usaha', 'lainnya']).optional().nullable(),
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
  type: z.enum(['expense', 'income']).default('expense'),
  title: z.string().min(1, 'Nama transaksi rutin/tagihan wajib diisi').max(150),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  due_day: z.number().int().min(1).max(31, 'Tanggal eksekusi/jatuh tempo harus antara 1 sampai 31'),
  category_id: z.string().uuid().optional().nullable(),
  wallet_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  auto_record: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const payBillSchema = z.object({
  wallet_id: z.string().uuid('Pilih dompet untuk pembayaran'),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  amount: z.number().positive('Nominal pembayaran harus lebih dari 0').optional(),
});

export const settingsSchema = z.object({
  name: z.string().min(1, 'Nama pengguna minimal 1 karakter').max(100).optional(),
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

export const assetSchema = z.object({
  name: z.string().min(1, 'Nama aset wajib diisi').max(100, 'Nama aset maksimal 100 karakter'),
  category: z.enum(['kendaraan', 'elektronik', 'properti', 'perhiasan_emas', 'alat_usaha', 'lainnya'], {
    errorMap: () => ({ message: 'Kategori aset tidak valid' }),
  }),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal perolehan harus YYYY-MM-DD'),
  purchase_price: z.number().positive('Harga perolehan harus lebih besar dari 0'),
  current_value: z.number().nonnegative('Nilai pasar saat ini tidak boleh negatif').optional().nullable(),
  depreciation_method: z.enum(['straight_line', 'declining_balance', 'none']).default('straight_line'),
  useful_life_years: z.number().int().min(1, 'Umur ekonomis minimal 1 tahun').max(100, 'Umur ekonomis maksimal 100 tahun').default(5),
  salvage_value: z.number().nonnegative('Nilai sisa/residu tidak boleh negatif').default(0),
  notes: z.string().max(500).optional().nullable(),
  // Opsi integrasi transaksi pembelian kas & jadwal rutin aset
  wallet_id: z.string().uuid().optional().nullable(),
  record_purchase_transaction: z.boolean().default(false), // Catat potong saldo dompet
  schedule_tax_amount: z.number().nonnegative().optional().nullable(), // Pajak rutin
  schedule_tax_due_day: z.number().int().min(1).max(31).optional().nullable(),
  schedule_maintenance_amount: z.number().nonnegative().optional().nullable(), // Servis rutin
  schedule_maintenance_due_day: z.number().int().min(1).max(31).optional().nullable(),
});

export const assetQuerySchema = z.object({
  category: z.enum(['kendaraan', 'elektronik', 'properti', 'perhiasan_emas', 'alat_usaha', 'lainnya']).optional(),
  search: z.string().max(100).optional(),
  status: z.enum(['all', 'active', 'sold']).optional().default('active'),
});

export const sellAssetSchema = z.object({
  selling_price: z.number().positive('Harga jual harus lebih besar dari 0'),
  sold_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal penjualan harus YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  wallet_id: z.string().uuid('Pilih dompet/rekening penerima dana penjualan yang valid'),
  notes: z.string().max(500).optional().nullable(),
});

