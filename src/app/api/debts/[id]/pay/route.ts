import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { debtPaymentSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const debtId = uuidIdParam.parse(id);

    const body = await readJsonBody(req);
    const validated = debtPaymentSchema.parse(body);

    const result = await withTransaction(async (client) => {
      // 1. Ambil data hutang/piutang
      const debtRes = await client.query(
        `SELECT id, type, person_name, total_amount::float AS total_amount, paid_amount::float AS paid_amount, (total_amount - paid_amount)::float AS remaining_amount, status FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [debtId, user.userId]
      );

      if (debtRes.rows.length === 0) {
        throw new BusinessError('Data hutang/piutang tidak ditemukan.', 404);
      }

      const debt = debtRes.rows[0];
      if (debt.status === 'paid') {
        throw new BusinessError('Hutang/piutang ini sudah lunas.', 400);
      }

      if (validated.amount > debt.remaining_amount) {
        throw new BusinessError(
          `Nominal pembayaran (Rp ${validated.amount.toLocaleString('id-ID')}) melebihi sisa hutang/piutang (Rp ${debt.remaining_amount.toLocaleString('id-ID')}).`,
          400
        );
      }

      // 2. Ambil dan kunci dompet
      const walletRes = await client.query(
        `SELECT id, name, balance::float AS balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [validated.wallet_id, user.userId]
      );

      if (walletRes.rows.length === 0) {
        throw new BusinessError('Dompet yang dipilih tidak ditemukan.', 404);
      }

      const _wallet = walletRes.rows[0];
      void _wallet;

      // 3. Mutasi saldo dompet (saldo diizinkan minus)
      if (debt.type === 'payable') {
        // Bayar hutang: saldo dompet berkurang
        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [validated.amount, validated.wallet_id, user.userId]
        );
      } else {
        // Terima piutang: saldo dompet bertambah
        await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
          [validated.amount, validated.wallet_id, user.userId]
        );
      }

      // 4. Catat transaksi keuangan di tabel transactions agar tercatat di cashflow dan history
      const trxType = debt.type === 'payable' ? 'expense' : 'income';
      const trxDesc =
        validated.notes ||
        (debt.type === 'payable'
          ? `Pembayaran Hutang: ${debt.person_name}`
          : `Penerimaan Piutang: ${debt.person_name}`);

      await client.query(
        `
        INSERT INTO transactions (
          user_id,
          type,
          amount,
          admin_fee,
          wallet_id,
          description,
          date
        ) VALUES ($1, $2, $3, 0, $4, $5, $6)
        `,
        [
          user.userId,
          trxType,
          validated.amount,
          validated.wallet_id,
          trxDesc,
          validated.payment_date,
        ]
      );

      // 5. Catat riwayat di debt_payments
      const paymentRes = await client.query(
        `
        INSERT INTO debt_payments (
          debt_id,
          user_id,
          wallet_id,
          amount,
          payment_date,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, amount::float AS amount, payment_date, notes, created_at
        `,
        [
          debtId,
          user.userId,
          validated.wallet_id,
          validated.amount,
          validated.payment_date,
          validated.notes || null,
        ]
      );

      // 6. Update paid_amount dan status pada debts
      const newPaidAmount = debt.paid_amount + validated.amount;
      const newStatus = newPaidAmount >= debt.total_amount ? 'paid' : 'partial';

      const updatedDebtRes = await client.query(
        `
        UPDATE debts 
        SET 
          paid_amount = $1,
          status = $2,
          updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        RETURNING 
          id,
          user_id,
          type,
          person_name,
          total_amount::float AS total_amount,
          paid_amount::float AS paid_amount,
          (total_amount - paid_amount)::float AS remaining_amount,
          due_date,
          notes,
          status,
          updated_at
        `,
        [newPaidAmount, newStatus, debtId, user.userId]
      );

      return {
        debt: updatedDebtRes.rows[0],
        payment: paymentRes.rows[0],
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Pembayaran hutang/piutang berhasil diproses.',
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'debts:pay');
  }
}
