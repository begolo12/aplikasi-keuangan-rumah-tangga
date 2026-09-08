import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { payBillSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { formatRupiah } from '@/lib/formatters';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);
    const validated = payBillSchema.parse(await readJsonBody(req));

    // Parse langsung dari string YYYY-MM-DD: aman dari pergeseran zona waktu.
    const [yearPart, monthPart] = validated.paid_date.split('-');
    const month = parseInt(monthPart, 10);
    const year = parseInt(yearPart, 10);

    const result = await withTransaction(async (client) => {
      // 1. Fetch bill details
      const billRows = await client.query(
        'SELECT * FROM recurring_bills WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );

      if (billRows.rows.length === 0) {
        throw new BusinessError('Tagihan tidak ditemukan.', 404);
      }

      const bill = billRows.rows[0];
      const billNominal = parseFloat(bill.amount);
      const amountToPay = validated.amount ?? billNominal;

      // Tolak overpay: pembayaran tidak boleh melebihi nominal tagihan.
      if (validated.amount && validated.amount > billNominal) {
        throw new BusinessError(
          `Nominal pembayaran melebihi tagihan. (Tagihan: ${formatRupiah(billNominal)})`
        );
      }
      // 2. Check if already paid for this month
      const existingPay = await client.query(
        'SELECT id FROM bill_payments WHERE user_id = $1 AND bill_id = $2 AND month = $3 AND year = $4',
        [session.userId, id, month, year]
      );

      if (existingPay.rows.length > 0) {
        throw new BusinessError(`Tagihan "${bill.title}" sudah lunas untuk periode ${month}/${year}.`);
      }


      // 3. Lock wallet
      const walletRows = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [validated.wallet_id, session.userId]
      );

      if (walletRows.rows.length === 0) {
        throw new BusinessError('Dompet pembayaran/penerimaan tidak ditemukan.', 404);
      }

      const isIncome = bill.type === 'income';
      const isTransfer = bill.type === 'transfer';

      // Transfer rutin: pindahkan dana dari dompet asal (body) ke dompet tujuan tagihan.
      if (isTransfer) {
        if (!bill.to_wallet_id) {
          throw new BusinessError('Tagihan transfer ini tidak memiliki dompet tujuan.', 400);
        }
        if (bill.to_wallet_id === validated.wallet_id) {
          throw new BusinessError('Dompet tujuan transfer tidak boleh sama dengan dompet asal.');
        }

        // Kunci kedua dompet terurut id agar bebas deadlock.
        const lockedWallets = await client.query(
          `SELECT id, balance FROM wallets
           WHERE user_id = $1 AND id = ANY($2::uuid[])
           ORDER BY id
           FOR UPDATE`,
          [session.userId, [validated.wallet_id, bill.to_wallet_id].sort()]
        );
        if (lockedWallets.rows.length !== 2) {
          throw new BusinessError('Dompet asal atau tujuan transfer tidak ditemukan.', 404);
        }

        const desc = `Transfer rutin: ${bill.title} (${month}/${year})`;
        await client.query(
          `INSERT INTO transactions (
            user_id, type, amount, wallet_id, to_wallet_id, description, date
          ) VALUES ($1, 'transfer', $2, $3, $4, $5, $6)`,
          [session.userId, amountToPay, validated.wallet_id, bill.to_wallet_id, desc, validated.paid_date]
        );

        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amountToPay, validated.wallet_id, session.userId]
        );
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amountToPay, bill.to_wallet_id, session.userId]
        );

        const transferPayment = await client.query(
          `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [session.userId, id, validated.paid_date, amountToPay, month, year]
        );

        return transferPayment.rows[0];
      }

      // 4. Mutasi saldo dompet (saldo diizinkan minus)
      if (isIncome) {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amountToPay, validated.wallet_id, session.userId]
        );
      } else {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amountToPay, validated.wallet_id, session.userId]
        );
      }

      // 5. Insert transaction record
      const trxType = isIncome ? 'income' : 'expense';
      const defaultDesc = isIncome
        ? `Pemasukan rutin: ${bill.title} (${month}/${year})`
        : `Pembayaran tagihan/rutin: ${bill.title} (${month}/${year})`;

      await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, category_id, wallet_id, description, date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session.userId,
          trxType,
          amountToPay,
          bill.category_id || null,
          validated.wallet_id,
          defaultDesc,
          validated.paid_date,
        ]
      );

      // 6. Insert bill payment log
      const paymentInsert = await client.query(
        `INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [session.userId, id, validated.paid_date, amountToPay, month, year]
      );

      // 7. Sync to debts jika tagihan ini berasal dari cicilan hutang.
      //    Hanya dieksekusi bila bill_payment baru BENAR-BENAR ter-insert (langkah 6 selalu insert baru:
      //    duplikat periode sudah ditolak lebih awal di langkah 2, jadi rowCount selalu 1).
      if (bill.debt_id && paymentInsert.rowCount && paymentInsert.rowCount > 0) {
        // Kunci baris hutang agar sinkronisasi dua arah aman dari race.
        const debtRows = await client.query(
          'SELECT id, total_amount::float AS total_amount, paid_amount::float AS paid_amount FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [bill.debt_id, session.userId]
        );

        if (debtRows.rows.length > 0) {
          const debt = debtRows.rows[0];
          const sisa = debt.total_amount - debt.paid_amount;
          const applied = Math.min(amountToPay, sisa);

          if (applied > 0) {
            await client.query(
              `INSERT INTO debt_payments (debt_id, user_id, wallet_id, amount, payment_date, notes)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [bill.debt_id, session.userId, validated.wallet_id, applied, validated.paid_date, 'Pembayaran cicilan via tagihan']
            );

            // CHECK paid_amount <= total_amount tetap terjaga karena applied <= sisa.
            const newPaid = debt.paid_amount + applied;
            const newStatus = newPaid >= debt.total_amount ? 'paid' : 'partial';
            await client.query(
              'UPDATE debts SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
              [newPaid, newStatus, bill.debt_id, session.userId]
            );
          }
        }
      }

      return paymentInsert.rows[0];
    });

    return NextResponse.json({ success: true, message: 'Tagihan berhasil dibayar.', data: result });
  } catch (error) {
    return handleRouteError(error, 'bills:pay');
  }
}
