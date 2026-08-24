import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { walletSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { Wallet } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);
    const validated = walletSchema.parse(await readJsonBody(req));

    // Unset default dan update dompet harus atomik agar tidak ada dua default.
    const updated = await withTransaction(async (client) => {
      if (validated.is_default) {
        await client.query('UPDATE wallets SET is_default = FALSE WHERE user_id = $1', [session.userId]);
      }
      const rows = await client.query<Wallet>(
        `UPDATE wallets
         SET name = $1, type = $2, icon = $3, color = $4, is_default = $5, updated_at = NOW()
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [validated.name, validated.type, validated.icon, validated.color, validated.is_default, id, session.userId]
      );
      return rows.rows[0] ?? null;
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Dompet tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleRouteError(error, 'wallets:put');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    // Safety check dan delete dalam satu transaksi: tanpa celah race.
    const deleted = await withTransaction(async (client) => {
      const trxs = await client.query(
        'SELECT id FROM transactions WHERE (wallet_id = $1 OR to_wallet_id = $1) AND user_id = $2 LIMIT 1',
        [id, session.userId]
      );
      if (trxs.rows.length > 0) return null;

      const rows = await client.query(
        `DELETE FROM wallets
         WHERE id = $1 AND user_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM transactions t WHERE (t.wallet_id = wallets.id OR t.to_wallet_id = wallets.id)
           )
         RETURNING id`,
        [id, session.userId]
      );
      return rows.rows[0] ?? null;
    });

    if (!deleted) {
      throw new BusinessError(
        'Dompet ini memiliki riwayat transaksi dan tidak dapat dihapus. Anda dapat mengubah namanya jika perlu.'
      );
    }

    return NextResponse.json({ success: true, message: 'Dompet berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'wallets:delete');
  }
}
