import type { DbTransactionClient } from './db';
import { BusinessError } from './apiHelpers';

export interface AutoProcessOptions {
  /** Bila true, hanya tagihan auto_record yang diproses (untuk cron). */
  autoRecordOnly?: boolean;
  /** YYYY-MM-DD: hanya tagihan yang jatuh tempo s.d. tanggal ini. */
  dueThrough?: string;
}

/**
 * Inti proses otomatis tagihan rutin per user per periode.
 * Dipakai ulang oleh tombol manual (`POST /api/bills/auto-process`)
 * dan cron harian (`POST /api/bills/cron`).
 * Idempoten per (bill, month, year) via guard + ON CONFLICT DO NOTHING.
 */
export async function processPendingBills(
  client: DbTransactionClient,
  userId: string,
  month: number,
  year: number,
  opts: AutoProcessOptions = {}
) {
  // 1. Ambil dompet default user jika recurring bill tidak punya wallet_id
  const defaultWalletRes = await client.query(
    `SELECT id FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, sort_order ASC, created_at ASC LIMIT 1`,
    [userId]
  );
  const fallbackWalletId = defaultWalletRes.rows[0]?.id;

  if (!fallbackWalletId) {
    throw new BusinessError('Belum ada dompet terdaftar. Tambahkan dompet terlebih dahulu.');
  }

  // 2. Ambil semua recurring bills yang aktif dan BELUM dibayar / dicatat di bulan & tahun ini
  const pendingBills = await client.query(
    `SELECT b.id, b.type, b.title, b.amount, b.due_day, b.category_id, b.wallet_id, b.to_wallet_id, b.debt_id
     FROM recurring_bills b
     LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
     WHERE b.user_id = $1 AND b.is_active = TRUE AND bp.id IS NULL
       AND ($4::boolean IS NOT TRUE OR COALESCE(b.auto_record, FALSE) = TRUE)
     ORDER BY b.due_day ASC`,
    [userId, month, year, opts.autoRecordOnly ?? false]
  );

  if (pendingBills.rows.length === 0) {
    return { processed_count: 0, message: 'Semua transaksi rutin untuk periode ini sudah tercatat.' };
  }

  // Kunci semua dompet target terurut UUID untuk mencegah race/deadlock (dua tab paralel tidak gandakan saldo)
  const uniqueWalletIds = Array.from(
    new Set<string>(
      pendingBills.rows.flatMap((b: { wallet_id: string | null; to_wallet_id: string | null }) =>
        [b.wallet_id || fallbackWalletId, b.to_wallet_id].filter((x): x is string => Boolean(x))
      )
    ).values()
  ).sort();
  if (uniqueWalletIds.length > 0) {
    const lockedWallets = await client.query(
      `SELECT id FROM wallets WHERE user_id = $1 AND id = ANY($2::uuid[]) FOR UPDATE`,
      [userId, uniqueWalletIds]
    );
    if (lockedWallets.rows.length !== uniqueWalletIds.length) throw new BusinessError('Dompet tagihan tidak ditemukan.', 404);
  }

  let processedCount = 0;

  for (const bill of pendingBills.rows) {
    const targetWalletId = bill.wallet_id || fallbackWalletId;
    const amount = parseFloat(bill.amount);
    const isIncome = bill.type === 'income';
    const isTransfer = bill.type === 'transfer';
    const dayStr = String(Math.min(28, bill.due_day)).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const executionDate = `${year}-${monthStr}-${dayStr}`;

    // Cron hanya mengeksekusi tagihan yang sudah jatuh tempo.
    if (opts.dueThrough && executionDate > opts.dueThrough) continue;

    // Cek idempotency sebelum mutasi: jika payment periode ini sudah ada, lewati dompet & transaksi
    const exists = await client.query(
      `SELECT 1 FROM bill_payments WHERE user_id = $1 AND bill_id = $2 AND month = $3 AND year = $4 LIMIT 1`,
      [userId, bill.id, month, year]
    );
    if (exists.rows.length > 0) continue;

    if (isTransfer) {
      // Transfer rutin: pindahkan dana dompet asal -> dompet tujuan (amplop).
      // to_wallet_id wajib ada; schema mencegah bill transfer tanpa tujuan.
      if (!bill.to_wallet_id) {
        throw new BusinessError(`Tagihan transfer "${bill.title}" tidak memiliki dompet tujuan.`, 400);
      }

      const desc = `Transfer rutin otomatis: ${bill.title} (${month}/${year})`;
      await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, wallet_id, to_wallet_id, description, date
        ) VALUES ($1, 'transfer', $2, $3, $4, $5, $6)`,
        [userId, amount, targetWalletId, bill.to_wallet_id, desc, executionDate]
      );

      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [amount, targetWalletId, userId]
      );
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [amount, bill.to_wallet_id, userId]
      );

      const payRes = await client.query(
        `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, bill_id, month, year) DO NOTHING`,
        [userId, bill.id, executionDate, amount, month, year]
      );
      if (payRes.rowCount === 0) throw new BusinessError('Tagihan sedang diproses di sesi lain. Coba lagi.', 409);

      processedCount++;
      continue;
    }

    // Update saldo dompet (diizinkan minus jika expense)
    if (isIncome) {
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [amount, targetWalletId, userId]
      );
    } else {
      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [amount, targetWalletId, userId]
      );
    }

    // Catat ke transactions
    const trxType = isIncome ? 'income' : 'expense';
    const desc = isIncome
      ? `Pemasukan rutin otomatis: ${bill.title} (${month}/${year})`
      : `Pengeluaran rutin otomatis: ${bill.title} (${month}/${year})`;

    await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, category_id, wallet_id, description, date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        trxType,
        amount,
        bill.category_id || null,
        targetWalletId,
        desc,
        executionDate,
      ]
    );

    // Catat log payment (final guard)
    const payRes = await client.query(
      `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, bill_id, month, year) DO NOTHING`,
      [userId, bill.id, executionDate, amount, month, year]
    );
    if (payRes.rowCount === 0) throw new BusinessError('Tagihan sedang diproses di sesi lain. Coba lagi.', 409);

    // Sinkronkan ke hutang jika tagihan ini merupakan cicilan hutang
    if (bill.debt_id) {
      const debtRows = await client.query(
        'SELECT id, total_amount::float AS total_amount, paid_amount::float AS paid_amount FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [bill.debt_id, userId]
      );

      if (debtRows.rows.length > 0) {
        const debt = debtRows.rows[0];
        const sisa = debt.total_amount - debt.paid_amount;
        const applied = Math.min(amount, sisa);

        if (applied > 0) {
          await client.query(
            `INSERT INTO debt_payments (debt_id, user_id, wallet_id, amount, payment_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [bill.debt_id, userId, targetWalletId, applied, executionDate, 'Pembayaran cicilan otomatis via tagihan']
          );

          const newPaid = debt.paid_amount + applied;
          const newStatus = newPaid >= debt.total_amount ? 'paid' : 'partial';
          await client.query(
            'UPDATE debts SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
            [newPaid, newStatus, bill.debt_id, userId]
          );
        }
      }
    }

    processedCount++;
  }

  return {
    processed_count: processedCount,
    message: `Berhasil mencatat otomatis ${processedCount} transaksi rutin periode ${month}/${year}.`,
  };
}
