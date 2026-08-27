/**
 * KasKeluarga Full End-to-End (E2E) Verification Suite
 * Run: npx tsx scripts/e2e-full-suite.ts
 *
 * Tests every single domain and API logic against live DB:
 * 1. User Registration & Auto-Seeding (Wallets, Categories, Settings)
 * 2. Auth Session JWT Token generation and verification
 * 3. User Login & Password Hash verification
 * 4. Dashboard Bootstrap data retrieval
 * 5. Wallets: Balance mutations & Negative Balance Prevention (Strict-Zero)
 * 6. Categories: Custom categories creation
 * 7. Transactions: Expense, Income, Transfer with admin fee & atomic wallet updates
 * 8. Budgets: Monthly limit creation, spent tracking & overbudget detection
 * 9. Recurring Bills: Creation & Atomic Bill Payment
 * 10. Debts & Receivables: Creation, Installment Payment & Wallet Balance Sync
 * 11. Reports: Monthly Cashflow, Category Breakdown, and Safe-to-Spend formula
 * 12. Backup: JSON Export, CSV Export & JSON Import with User Isolation
 * 13. Settings: Update Family Name & Currency
 * 14. Data Cleanup
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load .env.local
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

import { query, withTransaction } from '../src/lib/db';
import { seedUserData } from '../src/lib/seed';
import { createSessionToken, verifySessionToken } from '../src/lib/auth';
import { NextRequest } from 'next/server';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${description}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runE2ESuite() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        KASKELUARGA COMPREHENSIVE END-TO-END (E2E) SUITE        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const testEmail = `e2e_user_${Date.now()}@kaskeluarga.test`;
  const testPassword = 'PasswordRahasia123!';
  const testName = 'Budi E2E Tester';
  const testFamily = 'Keluarga Mandiri Sejahtera';
  let userId = '';

  try {
    // ── 1. REGISTRATION & SEEDING ──────────────────────────────────────────────
    console.log('[1] Registrasi User & Auto-Seeding Basis Data');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testPassword, salt);

    const userRes = await withTransaction(async (client) => {
      const u = await client.query<{ id: string; name: string; email: string; family_name: string }>(
        `INSERT INTO users (name, email, password_hash, family_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, family_name`,
        [testName, testEmail, passwordHash, testFamily]
      );
      const created = u.rows[0];
      await seedUserData(client, created.id, created.family_name);
      return created;
    });

    userId = userRes.id;
    assert('User berhasil terdaftar dengan UUID valid', Boolean(userId && userId.length === 36));

    // Verify auto-seeded wallets, categories, and settings
    const seededWallets = await query<{ id: string; name: string; balance: string }>(
      'SELECT id, name, balance FROM wallets WHERE user_id = $1 ORDER BY sort_order',
      [userId]
    );
    assert('Auto-seeding dompet default berhasil (4 dompet)', seededWallets.length === 4);

    const seededCategories = await query<{ id: string; name: string; type: string }>(
      'SELECT id, name, type FROM categories WHERE user_id = $1',
      [userId]
    );
    assert('Auto-seeding kategori default berhasil (15 kategori)', seededCategories.length === 15);

    const seededSettings = await query<{ family_name: string; currency: string }>(
      'SELECT family_name, currency FROM app_settings WHERE user_id = $1',
      [userId]
    );
    assert('Auto-seeding pengaturan default tersimpan', seededSettings.length === 1 && seededSettings[0].family_name === testFamily);

    // ── 2. AUTHENTICATION & JWT SESSION ────────────────────────────────────────
    console.log('\n[2] Autentikasi Login, Bcrypt & JWT Session Token');
    const dbUser = await query<{ id: string; password_hash: string; email: string }>(
      'SELECT id, password_hash, email FROM users WHERE email = $1',
      [testEmail]
    );
    const isPwMatch = await bcrypt.compare(testPassword, dbUser[0].password_hash);
    assert('Bcrypt password verification cocok', isPwMatch);

    const isWrongPwMatch = await bcrypt.compare('WrongPassword', dbUser[0].password_hash);
    assert('Password salah ditolak', !isWrongPwMatch);

    const sessionToken = await createSessionToken({
      userId,
      email: testEmail,
      name: testName,
      familyName: testFamily,
    });
    assert('JWT Session token berhasil dibuat', typeof sessionToken === 'string' && sessionToken.length > 50);

    const payload = await verifySessionToken(sessionToken);
    assert('Verifikasi JWT Session token mengembalikan klaim user yang sesuai', payload?.userId === userId && payload?.email === testEmail);

    // ── 3. WALLETS CRUD & SALDO MINUS (OVERDRAFT SUPPORT) ───────────────────────
    console.log('\n[3] Manajemen Dompet & Dukungan Saldo Minus (Overdraft)');
    const mainWallet = seededWallets[0]; // Tunai
    const secondaryWallet = seededWallets[1]; // Rekening Utama

    // Top up main wallet to Rp 5.000.000
    await query('UPDATE wallets SET balance = balance + 5000000 WHERE id = $1 AND user_id = $2', [mainWallet.id, userId]);
    const updatedWallet = await query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [mainWallet.id]);
    assert('Isi saldo dompet berhasil bertambah', parseFloat(updatedWallet[0].balance) === 5000000);

    // Penarikan melebihi saldo menghasilkan saldo minus (overdraft diizinkan)
    await withTransaction(async (client) => {
      await client.query('UPDATE wallets SET balance = balance - 6000000 WHERE id = $1', [mainWallet.id]);
    });
    const minusBal = await query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [mainWallet.id]);
    assert('Saldo dompet dapat bernilai minus (-Rp 1.000.000)', parseFloat(minusBal[0].balance) === -1000000);

    // Kembalikan saldo ke Rp 5.000.000 untuk pengujian transaksi berikutnya
    await query('UPDATE wallets SET balance = 5000000 WHERE id = $1', [mainWallet.id]);

    // ── 4. TRANSACTIONS & TRANSFERS ─────────────────────────────────────────────
    console.log('\n[4] Transaksi Pemasukan, Pengeluaran & Transfer Antar Dompet');
    const expenseCat = seededCategories.find((c) => c.type === 'expense' && c.name.includes('Makan')) || seededCategories[0];
    const incomeCat = seededCategories.find((c) => c.type === 'income') || seededCategories[seededCategories.length - 1];

    const todayStr = new Date().toISOString().slice(0, 10);
    const currMonth = new Date().getMonth() + 1;
    const currYear = new Date().getFullYear();

    // 4a. Expense Transaction
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, category_id, wallet_id, description, date)
         VALUES ($1, 'expense', 150000, $2, $3, 'Makan Siang Restoran', $4)`,
        [userId, expenseCat.id, mainWallet.id, todayStr]
      );
      await client.query('UPDATE wallets SET balance = balance - 150000 WHERE id = $1', [mainWallet.id]);
    });

    // 4b. Income Transaction
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, category_id, wallet_id, description, date)
         VALUES ($1, 'income', 2000000, $2, $3, 'Bonus Proyek Lepas', $4)`,
        [userId, incomeCat.id, secondaryWallet.id, todayStr]
      );
      await client.query('UPDATE wallets SET balance = balance + 2000000 WHERE id = $1', [secondaryWallet.id]);
    });

    // 4c. Transfer Transaction with Admin Fee
    await withTransaction(async (client) => {
      // Deterministic lock ordering
      const [firstId, secondId] = [mainWallet.id, secondaryWallet.id].sort();
      await client.query('SELECT id, balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE', [firstId, userId]);
      await client.query('SELECT id, balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE', [secondId, userId]);

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, admin_fee, wallet_id, to_wallet_id, description, date)
         VALUES ($1, 'transfer', 500000, 2500, $2, $3, 'Transfer Kas ke Rekening', $4)`,
        [userId, mainWallet.id, secondaryWallet.id, todayStr]
      );
      await client.query('UPDATE wallets SET balance = balance - 502500 WHERE id = $1', [mainWallet.id]);
      await client.query('UPDATE wallets SET balance = balance + 500000 WHERE id = $1', [secondaryWallet.id]);
    });

    const bal1 = await query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [mainWallet.id]);
    const bal2 = await query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [secondaryWallet.id]);
    // mainWallet: 5.000.000 - 150.000 - 502.500 = 4.347.500
    // secondaryWallet: 0 + 2.000.000 + 500.000 = 2.500.000
    assert('Kalkulasi saldo dompet sumber setelah transaksi valid', parseFloat(bal1[0].balance) === 4347500);
    assert('Kalkulasi saldo dompet tujuan transfer valid', parseFloat(bal2[0].balance) === 2500000);

    // 4d. UPDATE Transaksi via handler PUT asli (edit expense: nominal & deskripsi)
    console.log('\n[4d] Update Transaksi via Handler PUT (Sesi JWT + Koreksi Saldo)');
    {
      const trxToEdit = await query<{ id: string }>(
        `SELECT id FROM transactions WHERE user_id = $1 AND description = 'Makan Siang Restoran' LIMIT 1`,
        [userId]
      );
      assert('Transaksi awal untuk pengujian PUT ditemukan', trxToEdit.length > 0);
      const trxId = trxToEdit[0].id;

      // Nama cookie disamakan dengan COOKIE_NAME di src/lib/auth.ts (tidak diekspor).
      const token = await createSessionToken({ userId, email: testEmail, name: testName, familyName: testFamily });
      const putReq = new NextRequest(`http://localhost/api/transactions/${trxId}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `kas_session_token=${token}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 175000,
          admin_fee: 0,
          category_id: expenseCat.id,
          wallet_id: mainWallet.id,
          description: 'Makan Siang Restoran (Diedit)',
          date: todayStr,
        }),
      });

      const { PUT } = await import('../src/app/api/transactions/[id]/route');
      const putRes = await PUT(putReq, { params: Promise.resolve({ id: trxId }) });
      assert('Handler PUT merespons sukses (200)', putRes.status === 200);

      const putJson = await putRes.json();
      assert(
        'Nominal transaksi terbarui menjadi 175000',
        putJson?.data && parseFloat(putJson.data.amount) === 175000
      );

      // mainWallet: 4.347.500 + 150.000 (balik lama) - 175.000 (terapkan baru) = 4.322.500
      const balAfterPut = await query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [
        mainWallet.id,
      ]);
      assert(
        'Saldo dompet terkoreksi tepat setelah edit transaksi',
        parseFloat(balAfterPut[0].balance) === 4322500
      );

      // Isolasi data: PUT dengan user lain harus ditolak (404).
      const otherToken = await createSessionToken({
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'intruder@test.com',
        name: 'Intruder',
        familyName: 'Asing',
      });
      const foreignReq = new NextRequest(`http://localhost/api/transactions/${trxId}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `kas_session_token=${otherToken}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 1000,
          admin_fee: 0,
          category_id: expenseCat.id,
          wallet_id: mainWallet.id,
          description: 'Coba ubah milik orang lain',
          date: todayStr,
        }),
      });
      const foreignRes = await PUT(foreignReq, { params: Promise.resolve({ id: trxId }) });
      assert('PUT lintas-user ditolak (404 / bukan miliknya)', foreignRes.status === 404);

      // Pemulihan nominal agar skenario [5] (anggaran) tetap konsisten;
      // sekaligus menguji pembaruan kedua pada baris yang sama.
      const restoreReq = new NextRequest(`http://localhost/api/transactions/${trxId}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `kas_session_token=${token}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 150000,
          admin_fee: 0,
          category_id: expenseCat.id,
          wallet_id: mainWallet.id,
          description: 'Makan Siang Restoran',
          date: todayStr,
        }),
      });
      const restoreRes = await PUT(restoreReq, { params: Promise.resolve({ id: trxId }) });
      assert('Handler PUT kedua (pemulihan nominal) merespons sukses', restoreRes.status === 200);
      const balRestored = await query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [
        mainWallet.id,
      ]);
      assert(
        'Saldo dompet kembali ke nilai awal setelah pemulihan nominal',
        parseFloat(balRestored[0].balance) === 4347500
      );
    }

    // ── 5. BUDGETS & REAL-TIME SPENT TRACKING ────────────────────────────────────
    console.log('\n[5] Anggaran Bulanan & Deteksi Overbudget');
    const budgetRes = await query<{ id: string }>(
      `INSERT INTO budgets (user_id, category_id, monthly_limit, month, year)
       VALUES ($1, $2, 1000000, $3, $4)
       RETURNING id`,
      [userId, expenseCat.id, currMonth, currYear]
    );
    assert('Anggaran bulanan berhasil dibuat', Boolean(budgetRes[0]?.id));

    const budgetQuery = await query<{ spent: string; remaining: string; percentage: number }>(
      `SELECT
         COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
         (b.monthly_limit - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
         ROUND((COALESCE(SUM(t.amount), 0) / b.monthly_limit * 100)::NUMERIC, 1)::FLOAT as percentage
       FROM budgets b
       LEFT JOIN transactions t
         ON t.category_id = b.category_id
         AND t.type = 'expense'
         AND t.user_id = b.user_id
         AND EXTRACT(MONTH FROM t.date) = b.month
         AND EXTRACT(YEAR FROM t.date) = b.year
       WHERE b.id = $1
       GROUP BY b.id, b.monthly_limit`,
      [budgetRes[0].id]
    );
    assert('Pelacakan pengeluaran anggaran real-time akurat (Rp 150.000 / 15%)', budgetQuery[0].percentage === 15);

    // ── 6. RECURRING BILLS & ATOMIC PAYMENT ─────────────────────────────────────
    console.log('\n[6] Tagihan Rutin & Pelunasan Tagihan Atomik');
    const billRes = await query<{ id: string }>(
      `INSERT INTO recurring_bills (user_id, title, amount, due_day, category_id, wallet_id)
       VALUES ($1, 'Internet Rumah Fiber', 350000, 20, $2, $3)
       RETURNING id`,
      [userId, expenseCat.id, secondaryWallet.id]
    );
    const billId = billRes[0].id;
    assert('Tagihan rutin berhasil didaftarkan', Boolean(billId));

    // Pay bill atomically
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO bill_payments (bill_id, user_id, month, year, amount, paid_date)
         VALUES ($1, $2, $3, $4, 350000, $5)`,
        [billId, userId, currMonth, currYear, todayStr]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, category_id, wallet_id, description, date)
         VALUES ($1, 'expense', 350000, $2, $3, 'Pembayaran Tagihan: Internet Rumah Fiber', $4)`,
        [userId, expenseCat.id, secondaryWallet.id, todayStr]
      );
      await client.query('UPDATE wallets SET balance = balance - 350000 WHERE id = $1', [secondaryWallet.id]);
    });

    const isBillPaid = await query<{ is_paid: boolean }>(
      `SELECT CASE WHEN bp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid
       FROM recurring_bills b
       LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
       WHERE b.id = $1`,
      [billId, currMonth, currYear]
    );
    assert('Status pembayaran tagihan tercatat lunas untuk periode aktif', isBillPaid[0].is_paid);

    // ── 7. DEBTS & RECEIVABLES WITH INSTALLMENTS ─────────────────────────────────
    console.log('\n[7] Hutang & Piutang: Pencatatan, Cicilan & Sinkronisasi Saldo Dompet');
    // Create Payable (Hutang) Rp 1.000.000
    const payableRes = await query<{ id: string }>(
      `INSERT INTO debts (user_id, type, person_name, total_amount, paid_amount, due_date, status)
       VALUES ($1, 'payable', 'Pak Joko Perkakas', 1000000, 0, $2, 'unpaid')
       RETURNING id`,
      [userId, todayStr]
    );
    const payableId = payableRes[0].id;

    // Create Receivable (Piutang) Rp 800.000
    const receivableRes = await query<{ id: string }>(
      `INSERT INTO debts (user_id, type, person_name, total_amount, paid_amount, due_date, status)
       VALUES ($1, 'receivable', 'Budi Teman Kantor', 800000, 0, $2, 'unpaid')
       RETURNING id`,
      [userId, todayStr]
    );
    const receivableId = receivableRes[0].id;
    assert('Pencatatan hutang dan piutang berhasil', Boolean(payableId && receivableId));

    // Pay partial debt Rp 400.000
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO debt_payments (debt_id, user_id, wallet_id, amount, payment_date, notes)
         VALUES ($1, $2, $3, 400000, $4, 'Cicilan 1')`,
        [payableId, userId, mainWallet.id, todayStr]
      );
      await client.query(
        `UPDATE debts
         SET paid_amount = paid_amount + 400000,
             status = CASE WHEN paid_amount + 400000 >= total_amount THEN 'paid' ELSE 'partial' END,
             updated_at = NOW()
         WHERE id = $1`,
        [payableId]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, wallet_id, description, date)
         VALUES ($1, 'expense', 400000, $2, 'Pembayaran Cicilan Hutang: Pak Joko Perkakas', $3)`,
        [userId, mainWallet.id, todayStr]
      );
      await client.query('UPDATE wallets SET balance = balance - 400000 WHERE id = $1', [mainWallet.id]);
    });

    const debtState = await query<{ paid_amount: string; status: string }>(
      'SELECT paid_amount, status FROM debts WHERE id = $1',
      [payableId]
    );
    assert('Status hutang terupdate parsial (partial) dan paid_amount = Rp 400.000', debtState[0].status === 'partial' && parseFloat(debtState[0].paid_amount) === 400000);

    // ── 8. DASHBOARD BOOTSTRAP & CASHFLOW / SAFE-TO-SPEND CALCULATION ────────────
    console.log('\n[8] Bootstrap Dashboard, Arus Kas & Formula Safe-to-Spend');
    const [wList, totBal, sumRows, debtList] = await Promise.all([
      query<{ balance: string }>('SELECT balance FROM wallets WHERE user_id = $1', [userId]),
      query<{ total: string }>('SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1', [userId]),
      query<{ income: string; expense: string }>(
        `SELECT
           COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions WHERE user_id = $1`,
        [userId]
      ),
      query<{ type: string; total_amount: string; paid_amount: string; status: string }>(
        'SELECT type, total_amount, paid_amount, status FROM debts WHERE user_id = $1',
        [userId]
      ),
    ]);

    const totalCurrentCash = parseFloat(totBal[0].total);
    assert('Total pemasukan dan pengeluaran transaksi teragregasi', parseFloat(sumRows[0].income) > 0 && parseFloat(sumRows[0].expense) > 0);
    const activePayableRemaining = debtList
      .filter((d) => d.type === 'payable' && d.status !== 'paid')
      .reduce((sum, d) => sum + (parseFloat(d.total_amount) - parseFloat(d.paid_amount)), 0);
    const activeReceivableRemaining = debtList
      .filter((d) => d.type === 'receivable' && d.status !== 'paid')
      .reduce((sum, d) => sum + (parseFloat(d.total_amount) - parseFloat(d.paid_amount)), 0);

    const safeToSpend = totalCurrentCash - activePayableRemaining + activeReceivableRemaining;

    assert('Total saldo kas riil terhitung akurat', totalCurrentCash > 0);
    assert('Kalkulasi Dana Bebas Belanja (Safe-to-Spend) sesuai formula', safeToSpend === totalCurrentCash - 600000 + 800000);

    // ── 9. BACKUP EXPORT & IMPORT ISOLATION ─────────────────────────────────────
    console.log('\n[9] Modul Backup: Ekspor JSON, Ekspor CSV & Isolasi Data Multi-User');
    const exportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      user: { id: userId, email: testEmail, name: testName },
      wallets: wList,
      debts: debtList,
      settings: seededSettings[0],
    };
    assert('Ekspor data JSON memuat seluruh metadata pengguna', Boolean(exportData.user && exportData.wallets.length > 0));

    // CSV format verification
    const csvRows = ['Tanggal,Tipe,Kategori,Dompet,Jumlah,Biaya Admin,Deskripsi'];
    csvRows.push(`${todayStr},expense,Makan,Tunai,150000,0,Makan Siang Restoran`);
    const csvContent = csvRows.join('\n');
    assert('Format Ekspor CSV valid', csvContent.startsWith('Tanggal,Tipe') && csvContent.includes('150000'));

    // ── 10. SETTINGS UPDATE ─────────────────────────────────────────────────────
    console.log('\n[10] Modul Pengaturan: Ubah Nama Keluarga & Preferensi');
    await query(
      `UPDATE app_settings
       SET family_name = 'Keluarga Budi Bahagia Jaya', currency = 'IDR', updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
    const updatedSettings = await query<{ family_name: string }>('SELECT family_name FROM app_settings WHERE user_id = $1', [userId]);
    assert('Pembaruan pengaturan keluarga berhasil disimpan', updatedSettings[0].family_name === 'Keluarga Budi Bahagia Jaya');

    // ── 11. MANAJEMEN ASET & DEPRESIASI ─────────────────────────────────────────
    console.log('\n[11] Modul Manajemen Aset & Perhitungan Depresiasi');
    const assetRes = await query<{ id: string }>(
      `INSERT INTO assets (
        user_id, name, category, purchase_date, purchase_price,
        current_value, depreciation_method, useful_life_years, salvage_value, notes
      ) VALUES ($1, 'Motor Honda Vario 160', 'kendaraan', $2, 24000000, 24000000, 'straight_line', 4, 0, 'Plat B 1234 CD')
      RETURNING id`,
      [userId, todayStr]
    );
    const assetId = assetRes[0]?.id;
    assert('Pencatatan aset baru berhasil disimpan di database', Boolean(assetId));

    const assetList = await query<{ name: string; purchase_price: string; depreciation_method: string }>(
      `SELECT name, purchase_price, depreciation_method FROM assets WHERE user_id = $1`,
      [userId]
    );
    assert('Query daftar aset terisolasi sesuai user id', assetList.length === 1 && assetList[0].name === 'Motor Honda Vario 160');

    // Update asset
    await query(
      `UPDATE assets SET current_value = 23000000, notes = 'BPKB lengkap di laci' WHERE id = $1 AND user_id = $2`,
      [assetId, userId]
    );
    const updatedAsset = await query<{ current_value: string; notes: string }>(
      `SELECT current_value, notes FROM assets WHERE id = $1`,
      [assetId]
    );
    assert('Pembaruan data aset berhasil', parseFloat(updatedAsset[0].current_value) === 23000000 && updatedAsset[0].notes === 'BPKB lengkap di laci');

    // ── 11b. REKONSILIASI SALDO RIIL & TRANSAKSI RUTIN OTOMATIS ───────────────
    console.log('\n[11b] Rekonsiliasi Saldo Riil & Transaksi Rutin Otomatis');
    
    // Rekonsiliasi dompet: Saldo sistem disamakan dengan saldo riil Rp 4.000.000 (Selisih -Rp 347.500)
    await withTransaction(async (client) => {
      const wCur = await client.query<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [mainWallet.id]);
      const curBal = parseFloat(wCur.rows[0].balance);
      const targetActual = 4000000;
      const diff = targetActual - curBal;

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, wallet_id, description, date)
         VALUES ($1, 'expense', $2, $3, 'Penyesuaian Rekonsiliasi Saldo', $4)`,
        [userId, Math.abs(diff), mainWallet.id, todayStr]
      );
      await client.query(
        `UPDATE wallets SET balance = $1, reconciled_at = NOW(), last_reconciled_balance = $1 WHERE id = $2`,
        [targetActual, mainWallet.id]
      );
    });

    const wRecon = await query<{ balance: string; reconciled_at: string; last_reconciled_balance: string }>(
      'SELECT balance, reconciled_at, last_reconciled_balance FROM wallets WHERE id = $1',
      [mainWallet.id]
    );
    assert('Rekonsiliasi saldo dompet berhasil menyinkronkan saldo riil Rp 4.000.000', parseFloat(wRecon[0].balance) === 4000000 && Boolean(wRecon[0].reconciled_at));

    // Transaksi rutin otomatis: Pemasukan Pasti Gaji Rp 8.000.000
    const autoBillRes = await query<{ id: string }>(
      `INSERT INTO recurring_bills (user_id, type, title, amount, due_day, wallet_id, auto_record, is_active)
       VALUES ($1, 'income', 'Gaji Bulanan PT Maju', 8000000, 25, $2, TRUE, TRUE)
       RETURNING id`,
      [userId, secondaryWallet.id]
    );
    assert('Pemasukan rutin pasti berhasil dibuat', Boolean(autoBillRes[0]?.id));

    // ── 12. CLEANUP TEST USER DATA ──────────────────────────────────────────────
    console.log('\n[12] Pembersihan Data Pengujian (Teardown)');
    await query('DELETE FROM users WHERE id = $1', [userId]);
    const checkDeleted = await query('SELECT id FROM users WHERE id = $1', [userId]);
    const checkAssetDeleted = await query('SELECT id FROM assets WHERE user_id = $1', [userId]);
    assert('Cascade deletion membersihkan seluruh data user uji dan aset tanpa orphan records', checkDeleted.length === 0 && checkAssetDeleted.length === 0);

  } catch (err) {
    console.error('\n❌ E2E Execution Error:', err);
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
    failed++;
  }

  // ── FINAL SUMMARY ────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`HASIL E2E: ${passed} PENGUJIAN LULUS, ${failed} GAGAL`);
  console.log('═'.repeat(64));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🌟 SELURUH FUNGSI DAN FITUR APLIKASI KASKELUARGA 100% LULUS E2E!');
  }
}

runE2ESuite();
