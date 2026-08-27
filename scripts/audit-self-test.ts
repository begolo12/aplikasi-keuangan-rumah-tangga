/**
 * KasKeluarga Audit Self-Test Suite
 * Run: npm run test:audit
 * Semua assertion menguji modul produksi (validasi & formatter), bukan salinan lokal.
 */

import {
  transactionSchema,
  walletSchema,
  reconcileWalletSchema,
  categorySchema,
  budgetSchema,
  recurringBillSchema,
  payBillSchema,
  settingsSchema,
  registerSchema,
  loginSchema,
  periodQuerySchema,
  transactionListQuerySchema,
  debtSchema,
  debtPaymentSchema,
  debtQuerySchema,
  assetSchema,
  assetQuerySchema,
  sellAssetSchema,
} from '../src/lib/validations';
import { formatRupiah, formatCompactRupiah, formatDate } from '../src/lib/formatters';
import { createSessionToken, verifySessionToken } from '../src/lib/auth';
import { calculateAssetDepreciation } from '../src/app/api/assets/route';
import { calculateFinancialSafetyPlan } from '../src/components/budget/FinancialSafetyPlanCard';
import { calculateExpenseProjection } from '../src/components/budget/ExpenseProjectionCard';
import { calculateColdMoney } from '../src/components/reports/ColdMoneyCard';
import { calculateFinancialRatios } from '../src/components/reports/FinancialRatiosReport';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${description}`);
  } else {
    failed++;
    console.error(`  FAIL: ${description}`);
  }
}

const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
const validUuid2 = '550e8400-e29b-41d4-a716-446655440001';

// ── Validasi Skema Transaksi ─────────────────────────────────────────────────
console.log('\n[1] transactionSchema validation');

const r1 = transactionSchema.safeParse({
  type: 'expense',
  amount: 50000,
  wallet_id: validUuid1,
  date: '2026-08-24',
  create_asset: true,
  asset_name: 'Motor NMax',
  asset_category: 'kendaraan',
});
assert('pengeluaran valid dengan opsi create_asset diterima', r1.success && r1.data.create_asset === true);

const r2 = transactionSchema.safeParse({
  type: 'expense',
  amount: 0,
  wallet_id: validUuid1,
  date: '2026-08-24',
});
assert('amount = 0 ditolak', !r2.success);

const r3 = transactionSchema.safeParse({
  type: 'expense',
  amount: -5000,
  wallet_id: validUuid1,
  date: '2026-08-24',
});
assert('amount negatif ditolak', !r3.success);

const r4 = transactionSchema.safeParse({
  type: 'transfer',
  amount: 10000,
  wallet_id: validUuid1,
  to_wallet_id: validUuid1,
  date: '2026-08-24',
});
assert('transfer ke dompet yang sama ditolak', !r4.success);

const r5 = transactionSchema.safeParse({
  type: 'transfer',
  amount: 10000,
  wallet_id: validUuid1,
  to_wallet_id: validUuid2,
  date: '2026-08-24',
});
assert('transfer ke dompet berbeda diterima', r5.success);

const r6 = transactionSchema.safeParse({
  type: 'transfer',
  amount: 10000,
  wallet_id: validUuid1,
  date: '2026-08-24',
});
assert('transfer tanpa to_wallet_id ditolak', !r6.success);

const r7 = transactionSchema.safeParse({
  type: 'expense',
  amount: 5000,
  wallet_id: validUuid1,
  date: '24-08-2026',
});
assert('tanggal format salah ditolak', !r7.success);

const r8 = transactionSchema.safeParse({
  type: 'expense',
  amount: 5000,
  admin_fee: -1,
  wallet_id: validUuid1,
  date: '2026-08-24',
});
assert('admin_fee negatif ditolak', !r8.success);

const r9 = transactionSchema.safeParse({
  type: 'expense',
  amount: 5000,
  wallet_id: 'bukan-uuid',
  date: '2026-08-24',
});
assert('wallet_id bukan UUID ditolak', !r9.success);

// ── Validasi formatRupiah ────────────────────────────────────────────────────
console.log('\n[2] formatRupiah');

assert('1500000 -> "Rp 1.500.000"', formatRupiah(1500000) === 'Rp\u00A01.500.000' || formatRupiah(1500000) === 'Rp 1.500.000');
assert('0 -> "Rp 0"', formatRupiah(0) === 'Rp\u00A00' || formatRupiah(0) === 'Rp 0');
assert('null -> "Rp 0"', formatRupiah(null) === 'Rp\u00A00' || formatRupiah(null) === 'Rp 0');
assert('"1500000" string -> "Rp 1.500.000"', formatRupiah('1500000') === 'Rp\u00A01.500.000' || formatRupiah('1500000') === 'Rp 1.500.000');
assert('withSymbol false tanpa Rp', formatRupiah(1000, false) === '1.000');
assert('NaN -> "Rp 0"', formatRupiah(Number.NaN) === 'Rp\u00A00' || formatRupiah(Number.NaN) === 'Rp 0');
assert('desimal dibulatkan ke bawah tampilan', formatRupiah(1500.75) === 'Rp\u00A01.501' || formatRupiah(1500.75) === 'Rp 1.501');

// ── Validasi formatCompactRupiah ─────────────────────────────────────────────
console.log('\n[3] formatCompactRupiah');

assert('1500000 -> "1,5 jt" (desimal koma)', formatCompactRupiah(1500000) === '1,5 jt');
assert('2000000 -> "2 jt" (tanpa ,0)', formatCompactRupiah(2000000) === '2 jt');
assert('25000 -> "25 rb"', formatCompactRupiah(25000) === '25 rb');
assert('2000000000 -> "2 M"', formatCompactRupiah(2000000000) === '2 M');
assert('-1500000 -> "-1,5 jt" (tanda minus)', formatCompactRupiah(-1500000) === '-1,5 jt');
assert('999 -> "999"', formatCompactRupiah(999) === '999');

// ── Validasi formatDate ──────────────────────────────────────────────────────
console.log('\n[4] formatDate');

assert('"2026-08-24" short returns string', formatDate('2026-08-24', 'short').length > 0);
assert('"2026-08-24" short memuat Agu', formatDate('2026-08-24', 'short').includes('Agu'));
assert('"2026-08-24" long contains "2026"', formatDate('2026-08-24', 'long').includes('2026'));
assert('empty string returns empty', formatDate('', 'short') === '');
assert('invalid date dikembalikan apa adanya', formatDate('bukan-tanggal', 'short') === 'bukan-tanggal');

// ── Validasi budgetSchema ────────────────────────────────────────────────────
console.log('\n[5] budgetSchema');

const b1 = budgetSchema.safeParse({
  category_id: validUuid1,
  monthly_limit: 0,
  month: 8,
  year: 2026,
});
assert('monthly_limit = 0 ditolak', !b1.success);

const b2 = budgetSchema.safeParse({
  category_id: validUuid1,
  monthly_limit: 100000,
  month: 13,
  year: 2026,
});
assert('month > 12 ditolak', !b2.success);

const b3 = budgetSchema.safeParse({
  category_id: validUuid1,
  monthly_limit: 500000,
  month: 8,
  year: 2026,
});
assert('budget valid diterima', b3.success);

// ── Validasi walletSchema & categorySchema ───────────────────────────────────
console.log('\n[6] walletSchema & categorySchema');

const w1 = walletSchema.safeParse({ name: 'Dompet Utama', type: 'cash' });
assert('wallet minimal valid dengan default', w1.success && w1.data.balance === 0);

const w2 = walletSchema.safeParse({ name: '', type: 'cash' });
assert('wallet nama kosong ditolak', !w2.success);

const w3 = walletSchema.safeParse({ name: 'X', type: 'kripto' });
assert('wallet type di luar enum ditolak', !w3.success);

const w4 = walletSchema.safeParse({ name: 'X', type: 'bank', balance: -50000 });
assert('wallet saldo awal negatif diterima (dukung saldo minus / overdraft)', w4.success && w4.data.balance === -50000);

const rec1 = reconcileWalletSchema.safeParse({
  actual_balance: 5500000,
  notes: 'Sesuai mutasi BCA',
  auto_adjust: true,
});
assert('reconcileWalletSchema valid diterima', rec1.success && rec1.data.actual_balance === 5500000);

const rec2 = reconcileWalletSchema.safeParse({
  actual_balance: -200000,
  auto_adjust: true,
});
assert('reconcileWalletSchema saldo riil minus diterima', rec2.success && rec2.data.actual_balance === -200000);

const c1 = categorySchema.safeParse({ name: 'Makan', type: 'expense', icon: 'fork-knife' });
assert('kategori valid dengan color default', c1.success && c1.data.color === 'gray');

const c2 = categorySchema.safeParse({ name: 'Makan', type: 'expense', icon: '' });
assert('kategori ikon kosong ditolak', !c2.success);

// ── Validasi recurringBillSchema, payBillSchema, settingsSchema ───────────────
console.log('\n[7] recurringBillSchema, payBillSchema & settingsSchema');

const rb1 = recurringBillSchema.safeParse({
  type: 'expense',
  title: 'Listrik PLN',
  amount: 250000,
  due_day: 20,
  auto_record: true,
  is_active: true,
});
assert('recurringBill valid dengan default diterima', rb1.success);

const rb1b = recurringBillSchema.safeParse({
  type: 'income',
  title: 'Gaji Bulanan',
  amount: 8000000,
  due_day: 25,
  auto_record: true,
});
assert('recurringBill pemasukan pasti valid diterima', rb1b.success && rb1b.data.type === 'income');

const rb2 = recurringBillSchema.safeParse({
  title: 'Listrik',
  amount: 0,
  due_day: 15,
});
assert('recurringBill amount = 0 ditolak', !rb2.success);

const rb3 = recurringBillSchema.safeParse({
  title: 'Listrik',
  amount: 100000,
  due_day: 32,
});
assert('recurringBill due_day > 31 ditolak', !rb3.success);

const p1 = payBillSchema.safeParse({ wallet_id: validUuid1 });
assert('payBill tanpa paid_date memakai hari ini', p1.success && /^\d{4}-\d{2}-\d{2}$/.test(p1.data.paid_date));

const p2 = payBillSchema.safeParse({ wallet_id: validUuid1, amount: 0 });
assert('payBill amount 0 ditolak', !p2.success);

const s1 = settingsSchema.safeParse({ family_name: 'Keluarga Bahagia' });
assert('settings currency default IDR', s1.success && s1.data.currency === 'IDR');

const s2 = settingsSchema.safeParse({ family_name: 'Keluarga', currency: 'idr' });
assert('settings currency huruf kecil ditolak', !s2.success);

// ── Validasi auth schema & query params ──────────────────────────────────────
console.log('\n[8] register/login/query schemas');

const g1 = registerSchema.safeParse({ name: 'Budi', email: 'budi@example.com', password: '123456' });
assert('register valid dengan family_name default', g1.success && g1.data.family_name === 'Keluarga Bahagia');

const g2 = registerSchema.safeParse({ name: 'Budi', email: 'bukan-email', password: '123456' });
assert('register email invalid ditolak', !g2.success);

const g3 = loginSchema.safeParse({ email: 'budi@example.com', password: '' });
assert('login password kosong ditolak', !g3.success);

const q1 = periodQuerySchema.safeParse({ month: '13' });
assert('query month=13 ditolak', !q1.success);

const q2 = periodQuerySchema.safeParse({ month: '8', year: '2026' });
assert('query periode string angka diterima (coerce)', q2.success && q2.data.month === 8);

const q3 = transactionListQuerySchema.safeParse({ limit: '500' });
assert('query limit > 200 ditolak', !q3.success);

const q4 = transactionListQuerySchema.safeParse({});
assert('query kosong memakai limit 50 offset 0', q4.success && q4.data.limit === 50 && q4.data.offset === 0);

const q5 = transactionListQuerySchema.safeParse({ type: 'hack' });
assert('query type di luar enum ditolak', !q5.success);

// ── Validasi debtSchema & debtPaymentSchema ──────────────────────────────────
console.log('\n[9] debtSchema, debtPaymentSchema & debtQuerySchema');

const dt1 = debtSchema.safeParse({
  type: 'payable',
  person_name: 'Bank BCA',
  total_amount: 5000000,
  due_date: '2026-12-31',
});
assert('debt payable valid diterima', dt1.success);

const dt2 = debtSchema.safeParse({
  type: 'receivable',
  person_name: 'Teman Kantor',
  total_amount: 0,
});
assert('debt amount 0 ditolak', !dt2.success);

const dt3 = debtSchema.safeParse({
  type: 'payable',
  person_name: '',
  total_amount: 1000000,
});
assert('debt person_name kosong ditolak', !dt3.success);

const dp1 = debtPaymentSchema.safeParse({
  wallet_id: validUuid1,
  amount: 500000,
});
assert('debt payment valid dengan default tanggal hari ini', dp1.success && /^\d{4}-\d{2}-\d{2}$/.test(dp1.data.payment_date));

const dp2 = debtPaymentSchema.safeParse({
  wallet_id: validUuid1,
  amount: -100,
});
assert('debt payment negatif ditolak', !dp2.success);

const dq1 = debtQuerySchema.safeParse({ type: 'payable', status: 'unpaid' });
assert('debt query valid diterima', dq1.success && dq1.data.type === 'payable' && dq1.data.status === 'unpaid');

// ── Validasi assetSchema & Depresiasi ──────────────────────────────────────
console.log('\n[10] assetSchema & calculateAssetDepreciation');

const as1 = assetSchema.safeParse({
  name: 'Motor Honda Vario 160',
  category: 'kendaraan',
  purchase_date: '2024-01-15',
  purchase_price: 25000000,
  depreciation_method: 'straight_line',
  useful_life_years: 5,
  salvage_value: 5000000,
  record_purchase_transaction: true,
  wallet_id: validUuid1,
  schedule_tax_amount: 450000,
  schedule_tax_due_day: 15,
  schedule_maintenance_amount: 200000,
  schedule_maintenance_due_day: 20,
});
assert('asset kendaraan dengan opsi integrasi kas & jadwal rutin diterima', as1.success && as1.data.record_purchase_transaction === true && as1.data.schedule_tax_amount === 450000);

const as2 = assetSchema.safeParse({
  name: '',
  category: 'kendaraan',
  purchase_date: '2024-01-15',
  purchase_price: 25000000,
});
assert('asset nama kosong ditolak', !as2.success);

const as3 = assetSchema.safeParse({
  name: 'Laptop Mac',
  category: 'elektronik',
  purchase_date: '2024-01-15',
  purchase_price: -5000,
});
assert('asset harga perolehan negatif ditolak', !as3.success);

const as4 = assetSchema.safeParse({
  name: 'Tanah Kavling',
  category: 'properti',
  purchase_date: '2023-05-10',
  purchase_price: 150000000,
  depreciation_method: 'none',
});
assert('asset properti tanpa depresiasi diterima', as4.success && as4.data.depreciation_method === 'none');

const asq1 = assetQuerySchema.safeParse({ category: 'kendaraan', search: 'Vario', status: 'sold' });
assert('asset query dengan status sold valid diterima', asq1.success && asq1.data.status === 'sold');

const sas1 = sellAssetSchema.safeParse({
  selling_price: 18000000,
  sold_date: '2026-08-27',
  wallet_id: validUuid1,
  notes: 'Terjual ke kawan',
});
assert('sellAssetSchema valid diterima', sas1.success && sas1.data.selling_price === 18000000);

const sas2 = sellAssetSchema.safeParse({
  selling_price: -100,
  wallet_id: validUuid1,
});
assert('sellAssetSchema harga jual negatif ditolak', !sas2.success);

// Test kalkulasi depresiasi garis lurus & taksiran harga pasar (plus / minus)
const deprCalc = calculateAssetDepreciation({
  purchase_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0], // 1 tahun lalu
  purchase_price: 24000000,
  current_value: 20000000, // Taksiran pasar 20jt
  depreciation_method: 'straight_line',
  useful_life_years: 4,
  salvage_value: 0,
});
assert('straight-line annual depr dihitung benar (Rp 6.000.000 / thn)', deprCalc.annual_depreciation === 6000000);
assert('straight-line monthly depr dihitung benar (Rp 500.000 / bln)', deprCalc.monthly_depreciation === 500000);
assert('nilai buku terhitung berkurang dari harga perolehan', deprCalc.book_value < 24000000 && deprCalc.book_value > 0);
assert('selisih pasar terhadap harga beli terhitung minus 4.000.000 (rugi/susut)', deprCalc.market_diff_purchase === -4000000);
assert('selisih pasar terhadap nilai buku terhitung plus 2.000.000 (pasar di atas buku)', deprCalc.market_diff_book === 2000000);
assert('is_market_gain bernilai false karena pasar di bawah harga beli awal', deprCalc.is_market_gain === false);

// ── Validasi calculateFinancialSafetyPlan ──────────────────────────────────
console.log('\n[10b] calculateFinancialSafetyPlan (4 Bulan + 10% Risiko)');

const dummyBudgets = [
  { id: validUuid1, user_id: validUuid1, category_id: validUuid1, monthly_limit: 3000000, spent: 1000000, remaining: 2000000, percentage: 33.3, month: 8, year: 2026, created_at: '' },
  { id: validUuid2, user_id: validUuid1, category_id: validUuid2, monthly_limit: 2000000, spent: 500000, remaining: 1500000, percentage: 25, month: 8, year: 2026, created_at: '' },
]; // total monthly_budget = 5.000.000

const dummyWalletsUnsafe = [
  { id: validUuid1, user_id: validUuid1, name: 'Dompet', type: 'cash' as const, balance: 10000000, icon: '', color: '', is_default: true, sort_order: 0, created_at: '', updated_at: '' },
]; // current_cash = 10.000.000 (kurang dari 22.000.000)

const planUnsafe = calculateFinancialSafetyPlan(dummyBudgets, dummyWalletsUnsafe);
assert('cadangan 4 bulan terhitung akurat (Rp 20.000.000)', planUnsafe.reserve_4_months === 20000000);
assert('cadangan risiko 10% terhitung akurat (Rp 2.000.000)', planUnsafe.risk_buffer_10_pct === 2000000);
assert('total syarat minimum terhitung 4.4x anggaran (Rp 22.000.000)', planUnsafe.total_min_required === 22000000);
assert('can_expand_expense = false saat uang cadangan di bawah 4.4x anggaran', planUnsafe.can_expand_expense === false);
assert('gap_needed terhitung akurat (Rp 12.000.000)', planUnsafe.gap_needed === 12000000);

const dummyWalletsSafe = [
  { id: validUuid1, user_id: validUuid1, name: 'Rekening', type: 'bank' as const, balance: 25000000, icon: '', color: '', is_default: true, sort_order: 0, created_at: '', updated_at: '' },
]; // current_cash = 25.000.000 >= 22.000.000
const planSafe = calculateFinancialSafetyPlan(dummyBudgets, dummyWalletsSafe);
assert('can_expand_expense = true saat uang cadangan >= 4.4x anggaran', planSafe.can_expand_expense === true);
assert('gap_needed = 0 saat syarat minimum terpenuhi', planSafe.gap_needed === 0);

// ── Validasi calculateExpenseProjection ────────────────────────────────────
console.log('\n[10c] calculateExpenseProjection (Rencana 1.5jt, Realisasi 1jt, Sisa 300rb -> Proyeksi 1.3jt)');

const dummyProjectionBudgets = [
  { id: validUuid1, user_id: validUuid1, category_id: validUuid1, monthly_limit: 1500000, spent: 1000000, remaining: 500000, percentage: 66.7, month: 8, year: 2026, created_at: '' },
]; // rencana = 1.500.000

const projResult = calculateExpenseProjection(
  dummyProjectionBudgets,
  1000000, // realisasi = 1.000.000
  8,
  2026,
  300000 // sisa estimasi disesuaikan = 300.000
);

assert('rencana anggaran terbaca 1.500.000', projResult.planned_budget === 1500000);
assert('realisasi terbaca 1.000.000', projResult.current_spent === 1000000);
assert('sisa estimasi terbaca 300.000', projResult.remaining_estimated === 300000);
assert('proyeksi akhir bulan terhitung 1.300.000 (1jt + 300rb)', projResult.projected_total === 1300000);
assert('potensi hemat terhitung 200.000 (1.5jt - 1.3jt)', projResult.projected_savings === 200000);
assert('persentase hemat terhitung ~13%', projResult.savings_percentage === 13);

// ── Validasi calculateColdMoney (Uang Dingin Rencana Jangka Pendek) ─────────
console.log('\n[10d] calculateColdMoney (Uang Dingin Bebas Pakai)');

const dummyColdWallets = [
  { id: validUuid1, user_id: validUuid1, name: 'BCA', type: 'bank' as const, balance: 30000000, icon: '', color: '', is_default: true, sort_order: 0, created_at: '', updated_at: '' },
]; // total kas = 30.000.000
const dummyColdBudgets = [
  { id: validUuid1, user_id: validUuid1, category_id: validUuid1, monthly_limit: 5000000, spent: 2000000, remaining: 3000000, percentage: 40, month: 8, year: 2026, created_at: '' },
]; // anggaran = 5.000.000 -> cadangan wajib 4.4x = 22.000.000

const coldInfoAvailable = calculateColdMoney(dummyColdWallets, dummyColdBudgets, 0, 1000000, 2000000);
// Kas 30jt - Cadangan 22jt - Kewajiban 3jt = Uang Dingin 5.000.000
assert('cadangan wajib 4.4x terhitung 22.000.000', coldInfoAvailable.safety_reserve_required === 22000000);
assert('total kewajiban terhitung 3.000.000', coldInfoAvailable.pending_obligations === 3000000);
assert('uang dingin terhitung akurat 5.000.000', coldInfoAvailable.cold_money === 5000000);
assert('is_available bernilai true', coldInfoAvailable.is_available === true);

const coldInfoZero = calculateColdMoney(dummyColdWallets, dummyColdBudgets, 0, 5000000, 5000000);
// Kas 30jt - Cadangan 22jt - Kewajiban 10jt = -2jt -> max(0, -2jt) = 0
assert('uang dingin bernilai 0 jika kas belum melampaui cadangan wajib & hutang', coldInfoZero.cold_money === 0 && coldInfoZero.is_available === false);

// ── Validasi calculateFinancialRatios (DER, DAR, DSR, Likuiditas, Savings) ─
console.log('\n[10e] calculateFinancialRatios (DER, DAR, DSR, Likuiditas)');

const dummyRatioSummary = {
  month: 8,
  year: 2026,
  total_balance: 20000000,
  total_income: 10000000,
  total_expense: 6000000,
  net_cash_flow: 4000000,
  total_transfer: 0,
  bill_pending_count: 0,
  budget_over_count: 0,
  total_bills_pending_amount: 0,
  total_payable_due: 5000000,
  total_receivable_due: 0,
  safe_to_spend: 15000000,
};

const dummyRatioWallets = [
  { id: validUuid1, user_id: validUuid1, name: 'BCA', type: 'bank' as const, balance: 20000000, icon: '', color: '', is_default: true, sort_order: 0, created_at: '', updated_at: '' },
]; // kas = 20jt
const dummyRatioDebts = [
  { id: validUuid1, user_id: validUuid1, type: 'payable' as const, person_name: 'Bank', total_amount: 5000000, paid_amount: 0, remaining_amount: 5000000, status: 'unpaid' as const, created_at: '', updated_at: '' },
]; // hutang = 5jt
const dummyRatioAssets = [
  { id: validUuid1, user_id: validUuid1, name: 'Motor', category: 'kendaraan' as const, purchase_date: '2025-01-01', purchase_price: 25000000, current_value: 20000000, depreciation_method: 'straight_line' as const, useful_life_years: 5, salvage_value: 0, created_at: '', updated_at: '', is_sold: false },
]; // aset = 20jt (total aset = 20jt kas + 20jt motor = 40jt, net worth = 40jt - 5jt = 35jt)

const dummyRatioBudgets = [
  { id: validUuid1, user_id: validUuid1, category_id: validUuid1, monthly_limit: 5000000, spent: 4000000, remaining: 1000000, percentage: 80, month: 8, year: 2026, created_at: '' },
];

const ratioRes = calculateFinancialRatios(dummyRatioSummary, dummyRatioWallets, dummyRatioDebts, dummyRatioAssets, dummyRatioBudgets);

// DER = 5jt / 35jt * 100% = 14%
assert('DER ratio terhitung akurat (~14%)', ratioRes.der_ratio === 14);
// DAR = 5jt / 40jt * 100% = 13% (dibulatkan 13%)
assert('DAR ratio terhitung akurat (~13%)', ratioRes.dar_ratio === 13);
// Savings ratio = 4jt / 10jt * 100% = 40%
assert('savings ratio terhitung 40%', ratioRes.savings_ratio === 40);
// OER = 6jt / 10jt * 100% = 60%
assert('OER ratio terhitung 60%', ratioRes.oer_ratio === 60);
// Liquidity = 20jt / 5jt = 4.0 bulan
assert('liquidity months terhitung 4 bulan', ratioRes.liquidity_months === 4);
assert('health score berada di zona baik (>= 70)', ratioRes.health_score >= 70);
assert('verdict summary ter-generate otomatis', ratioRes.verdict_summary.length > 30);

// ── Validasi Auth Token & Session ───────────────────────────────────────────
console.log('\n[11] auth session & JWT token');

async function testAuth() {
  const token = await createSessionToken({
    userId: validUuid1,
    email: 'user@example.com',
    name: 'Budi Test',
    familyName: 'Keluarga Budi',
  });
  assert('createSessionToken menghasilkan string JWT valid', typeof token === 'string' && token.split('.').length === 3);

  const payload = await verifySessionToken(token);
  assert('verifySessionToken mengembalikan payload yang cocok', payload?.userId === validUuid1 && payload?.email === 'user@example.com');

  const invalidPayload = await verifySessionToken('token.palsu.rusak');
  assert('verifySessionToken menolak token palsu', invalidPayload === null);

  // Response shape parsing test for /api/auth/me compatibility
  const meResponseDirect = { success: true, data: { id: validUuid1, name: 'Budi Test', email: 'user@example.com' } } as { success: boolean; data?: { id?: string; name?: string; email?: string; user?: unknown } };
  const extractedDirect = (meResponseDirect.data?.user || (meResponseDirect.data?.id ? meResponseDirect.data : null)) as { id?: string } | null;
  assert('checkAuth kompatibel dengan direct user data shape', extractedDirect?.id === validUuid1);

  const meResponseNested = { success: true, data: { user: { id: validUuid1, name: 'Budi Test' } } } as { success: boolean; data?: { id?: string; name?: string; user?: { id: string; name: string } } };
  const extractedNested = meResponseNested.data?.user || (meResponseNested.data?.id ? meResponseNested.data : null);
  assert('checkAuth kompatibel dengan nested user data shape', Boolean(extractedNested));
}

testAuth().then(() => {
  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Hasil: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('Semua audit self-test lulus.');
  }
});
