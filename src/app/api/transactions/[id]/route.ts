import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { uuidIdParam } from '@/lib/validations';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    await withTransaction(async (client) => {
      // 1. Kunci baris transaksi milik user ini.
      const trxRows = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );

      if (trxRows.rows.length === 0) {
        throw new BusinessError('Transaksi tidak ditemukan.', 404);
      }

      const trx = trxRows.rows[0];
      const amount = parseFloat(trx.amount);
      const adminFee = parseFloat(trx.admin_fee || 0);

      // 2. Balik saldo dompet; semua akses wallet difilter user_id.
      if (trx.type === 'expense') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, trx.wallet_id, session.userId]
        );
      } else if (trx.type === 'income') {
        const wRows = await client.query(
          'SELECT balance, name FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [trx.wallet_id, session.userId]
        );
        if (wRows.rows.length === 0) {
          throw new BusinessError('Dompet transaksi tidak ditemukan.', 404);
        }
        if (parseFloat(wRows.rows[0].balance) < amount) {
          throw new BusinessError(`Tidak dapat menghapus pemasukan: Saldo ${wRows.rows[0].name} akan menjadi negatif.`);
        }
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, trx.wallet_id, session.userId]
        );
      } else if (trx.type === 'transfer') {
        const toWRows = await client.query(
          'SELECT balance, name FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [trx.to_wallet_id, session.userId]
        );
        if (toWRows.rows.length === 0) {
          throw new BusinessError('Dompet tujuan transfer tidak ditemukan.', 404);
        }
        if (parseFloat(toWRows.rows[0].balance) < amount) {
          throw new BusinessError(
            `Tidak dapat membatalkan transfer: Saldo ${toWRows.rows[0].name} telah terpakai dan tidak mencukupi untuk ditarik kembali.`
          );
        }
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount + adminFee, trx.wallet_id, session.userId]
        );
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [amount, trx.to_wallet_id, session.userId]
        );
      }

      // 3. Hapus catatan transaksi.
      await client.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, session.userId]);
    });

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } catch (error) {
    return handleRouteError(error, 'transactions:delete');
  }
}
