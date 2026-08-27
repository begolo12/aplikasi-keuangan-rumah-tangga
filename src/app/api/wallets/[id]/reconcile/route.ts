import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { reconcileWalletSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { formatRupiah } from '@/lib/formatters';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const walletId = uuidIdParam.parse(id);
    const validated = reconcileWalletSchema.parse(await readJsonBody(req));

    const result = await withTransaction(async (client) => {
      // 1. Kunci data dompet
      const walletRes = await client.query(
        'SELECT id, name, balance::float as balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [walletId, session.userId]
      );

      if (walletRes.rows.length === 0) {
        throw new BusinessError('Dompet tidak ditemukan.', 404);
      }

      const wallet = walletRes.rows[0];
      const systemBalance = parseFloat(wallet.balance);
      const actualBalance = validated.actual_balance;
      const difference = actualBalance - systemBalance; // Positif: riil lebih besar, Negatif: riil lebih kecil

      let createdTrx = null;

      // 2. Jika ada selisih dan auto_adjust aktif, buat transaksi penyesuaian
      if (validated.auto_adjust && Math.abs(difference) > 0.01) {
        const trxType = difference > 0 ? 'income' : 'expense';
        const adjustAmount = Math.abs(difference);
        const desc = validated.notes
          ? `Penyesuaian Rekonsiliasi Saldo: ${validated.notes}`
          : `Penyesuaian Rekonsiliasi Saldo ${wallet.name} (Selisih ${difference > 0 ? '+' : ''}${formatRupiah(difference)})`;

        // Catat transaksi penyesuaian
        const insTrx = await client.query(
          `INSERT INTO transactions (
            user_id, type, amount, category_id, wallet_id, description, date
          ) VALUES ($1, $2, $3, NULL, $4, $5, $6)
          RETURNING *`,
          [
            session.userId,
            trxType,
            adjustAmount,
            walletId,
            desc,
            validated.reconcile_date,
          ]
        );
        createdTrx = insTrx.rows[0];

        // Update saldo dompet persis sama dengan saldo fisik/rekening riil
        await client.query(
          `UPDATE wallets
           SET balance = $1, reconciled_at = NOW(), last_reconciled_balance = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [actualBalance, walletId, session.userId]
        );
      } else {
        // Hanya catat waktu rekonsiliasi tanpa mutasi saldo
        await client.query(
          `UPDATE wallets
           SET reconciled_at = NOW(), last_reconciled_balance = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [actualBalance, walletId, session.userId]
        );
      }

      return {
        wallet_id: walletId,
        wallet_name: wallet.name,
        system_balance: systemBalance,
        actual_balance: actualBalance,
        difference,
        is_matched: Math.abs(difference) <= 0.01,
        auto_adjusted: validated.auto_adjust && Math.abs(difference) > 0.01,
        adjustment_transaction: createdTrx,
      };
    });

    return NextResponse.json({
      success: true,
      message: result.is_matched
        ? `Saldo ${result.wallet_name} cocok dengan rekening riil.`
        : result.auto_adjusted
        ? `Saldo ${result.wallet_name} berhasil disesuaikan dengan rekening riil.`
        : `Hasil rekonsiliasi ${result.wallet_name} tercatat (selisih: ${formatRupiah(result.difference)}).`,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'wallets:reconcile');
  }
}
