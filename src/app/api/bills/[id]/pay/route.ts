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
        'SELECT * FROM recurring_bills WHERE id = $1 AND user_id = $2',
        [id, session.userId]
      );

      if (billRows.rows.length === 0) {
        throw new BusinessError('Tagihan tidak ditemukan.', 404);
      }

      const bill = billRows.rows[0];
      const billNominal = parseFloat(bill.amount);
      const amountToPay = validated.amount || billNominal;

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

      // 3. Lock and check wallet balance
      const walletRows = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [validated.wallet_id, session.userId]
      );

      if (walletRows.rows.length === 0) {
        throw new BusinessError('Dompet pembayaran tidak ditemukan.', 404);
      }

      const wallet = walletRows.rows[0];
      const balance = parseFloat(wallet.balance);

      if (balance < amountToPay) {
        throw new BusinessError(
          `Saldo ${wallet.name} tidak mencukupi untuk membayar tagihan ini. (Tersedia: ${formatRupiah(balance)}, Tagihan: ${formatRupiah(amountToPay)})`
        );
      }

      // 4. Debit wallet balance
      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [amountToPay, validated.wallet_id, session.userId]
      );

      // 5. Insert transaction record
      await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, category_id, wallet_id, description, date
        ) VALUES ($1, 'expense', $2, $3, $4, $5, $6)`,
        [
          session.userId,
          amountToPay,
          bill.category_id || null,
          validated.wallet_id,
          `Pembayaran tagihan: ${bill.title} (${month}/${year})`,
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

      return paymentInsert.rows[0];
    });

    return NextResponse.json({ success: true, message: 'Tagihan berhasil dibayar.', data: result });
  } catch (error) {
    return handleRouteError(error, 'bills:pay');
  }
}
