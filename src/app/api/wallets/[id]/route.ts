import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { walletSchema } from '@/lib/validations';
import { Wallet } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const validated = walletSchema.parse(body);

    if (validated.is_default) {
      await query(`UPDATE wallets SET is_default = FALSE WHERE user_id = $1`, [session.userId]);
    }

    const updated = await query<Wallet>(
      `UPDATE wallets
       SET name = $1, type = $2, icon = $3, color = $4, is_default = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [validated.name, validated.type, validated.icon, validated.color, validated.is_default, id, session.userId]
    );

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Dompet tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Update wallet error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Check if wallet has transactions
    const trxs = await query(
      'SELECT id FROM transactions WHERE (wallet_id = $1 OR to_wallet_id = $1) AND user_id = $2 LIMIT 1',
      [id, session.userId]
    );

    if (trxs.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dompet ini memiliki riwayat transaksi dan tidak dapat dihapus. Anda dapat mengubah namanya jika perlu.',
        },
        { status: 400 }
      );
    }

    await query('DELETE FROM wallets WHERE id = $1 AND user_id = $2', [id, session.userId]);

    return NextResponse.json({ success: true, message: 'Dompet berhasil dihapus' });
  } catch (error: any) {
    console.error('Delete wallet error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
