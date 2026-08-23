import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { transactionSchema } from '@/lib/validations';
import { formatRupiah } from '@/lib/formatters';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await withTransaction(async (client) => {
      // 1. Fetch transaction
      const trxRows = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );

      if (trxRows.rows.length === 0) {
        throw new Error('Transaksi tidak ditemukan.');
      }

      const trx = trxRows.rows[0];
      const amount = parseFloat(trx.amount);
      const adminFee = parseFloat(trx.admin_fee || 0);

      // 2. Revert wallet balances
      if (trx.type === 'expense') {
        // Revert expense: add balance back
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, trx.wallet_id]);
      } else if (trx.type === 'income') {
        // Revert income: subtract balance
        const wRows = await client.query('SELECT balance, name FROM wallets WHERE id = $1 FOR UPDATE', [trx.wallet_id]);
        if (wRows.rows.length > 0 && parseFloat(wRows.rows[0].balance) < amount) {
          throw new Error(`Tidak dapat menghapus pemasukan: Saldo ${wRows.rows[0].name} akan menjadi negatif.`);
        }
        await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, trx.wallet_id]);
      } else if (trx.type === 'transfer') {
        // Revert transfer: check dest wallet, add to source, subtract from dest
        const toWRows = await client.query('SELECT balance, name FROM wallets WHERE id = $1 FOR UPDATE', [trx.to_wallet_id]);
        if (toWRows.rows.length > 0 && parseFloat(toWRows.rows[0].balance) < amount) {
          throw new Error(`Tidak dapat membatalkan transfer: Saldo ${toWRows.rows[0].name} telah terpakai dan tidak mencukupi untuk ditarik kembali.`);
        }
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount + adminFee, trx.wallet_id]);
        await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, trx.to_wallet_id]);
      }

      // 3. Delete transaction record
      await client.query('DELETE FROM transactions WHERE id = $1', [id]);
    });

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menghapus transaksi' }, { status: 400 });
  }
}
