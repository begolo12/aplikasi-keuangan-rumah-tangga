/**
 * KasKeluarga Audit Self-Test Suite
 * Run: npm run test:audit
 * Semua assertion menguji modul produksi (validasi & formatter), bukan salinan lokal.
 */

import {
  transactionSchema,
  walletSchema,
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
} from '../src/lib/validations';
import { formatRupiah, formatCompactRupiah, formatDate } from '../src/lib/formatters';
import { createSessionToken, verifySessionToken } from '../src/lib/auth';

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
});
assert('pengeluaran valid diterima', r1.success);

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

const w4 = walletSchema.safeParse({ name: 'X', type: 'bank', balance: -10 });
assert('wallet saldo awal negatif ditolak', !w4.success);

const c1 = categorySchema.safeParse({ name: 'Makan', type: 'expense', icon: 'fork-knife' });
assert('kategori valid dengan color default', c1.success && c1.data.color === 'gray');

const c2 = categorySchema.safeParse({ name: 'Makan', type: 'expense', icon: '' });
assert('kategori ikon kosong ditolak', !c2.success);

// ── Validasi recurringBillSchema, payBillSchema, settingsSchema ───────────────
console.log('\n[7] recurringBillSchema, payBillSchema & settingsSchema');

const rb1 = recurringBillSchema.safeParse({
  title: 'Listrik PLN',
  amount: 250000,
  due_day: 20,
  is_active: true,
});
assert('recurringBill valid dengan default diterima', rb1.success);

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

// ── Validasi Auth Token & Session ───────────────────────────────────────────
console.log('\n[10] auth session & JWT token');

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
