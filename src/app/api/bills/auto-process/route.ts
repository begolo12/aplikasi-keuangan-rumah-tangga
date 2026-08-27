import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const parsed = periodQuerySchema.parse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const month = parsed.month ?? now.getMonth() + 1;
    const year = parsed.year ?? now.getFullYear();

    const result = await withTransaction(async (client) => {
      // 1. Ambil dompet default user jika recurring bill tidak punya wallet_id
      const defaultWalletRes = await client.query(
        `SELECT id FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, sort_order ASC, created_at ASC LIMIT 1`,
        [session.userId]
      );
      const fallbackWalletId = defaultWalletRes.rows[0]?.id;

      if (!fallbackWalletId) {
        throw new BusinessError('Belum ada dompet terdaftar. Tambahkan dompet terlebih dahulu.');
      }

      // 2. Ambil semua recurring bills yang aktif dan BELUM dibayar / dicatat di bulan & tahun ini
      const pendingBills = await client.query(
        `SELECT b.id, b.type, b.title, b.amount, b.due_day, b.category_id, b.wallet_id
         FROM recurring_bills b
         LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
         WHERE b.user_id = $1 AND b.is_active = TRUE AND bp.id IS NULL
         ORDER BY b.due_day ASC`,
        [session.userId, month, year]
      );

      if (pendingBills.rows.length === 0) {
        return { processed_count: 0, message: 'Semua transaksi rutin untuk periode ini sudah tercatat.' };
      }

      let processedCount = 0;

      for (const bill of pendingBills.rows) {
        const targetWalletId = bill.wallet_id || fallbackWalletId;
        const amount = parseFloat(bill.amount);
        const isIncome = bill.type === 'income';
        const dayStr = String(Math.min(28, bill.due_day)).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const executionDate = `${year}-${monthStr}-${dayStr}`;

        // Update saldo dompet (diizinkan minus jika expense)
        if (isIncome) {
          await client.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
            [amount, targetWalletId, session.userId]
          );
        } else {
          await client.query(
            'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
            [amount, targetWalletId, session.userId]
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
            session.userId,
            trxType,
            amount,
            bill.category_id || null,
            targetWalletId,
            desc,
            executionDate,
          ]
        );

        // Catat log payment
        await client.query(
          `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, bill_id, month, year) DO NOTHING`,
          [session.userId, bill.id, executionDate, amount, month, year]
        );

        processedCount++;
      }

      return {
        processed_count: processedCount,
        message: `Berhasil mencatat otomatis ${processedCount} transaksi rutin periode ${month}/${year}.`,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error, 'bills:auto-process');
  }
}
