import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { uuidIdParam, savingsGoalSchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    const validated = savingsGoalSchema.parse(await readJsonBody(req));

    if (validated.wallet_id) {
      const owned = await query('SELECT id FROM wallets WHERE id = $1 AND user_id = $2', [
        validated.wallet_id,
        session.userId,
      ]);
      if (owned.length === 0) {
        throw new BusinessError('Dompet tujuan tidak ditemukan.', 404);
      }
    }

    const rows = await query(
      `UPDATE savings_goals SET
        name = $2, target_amount = $3, target_date = $4, wallet_id = $5, notes = $6,
        is_active = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $7
       RETURNING id`,
      [id, validated.name, validated.target_amount, validated.target_date || null, validated.wallet_id || null, validated.notes || null, session.userId]
    );

    if (rows.length === 0) {
      throw new BusinessError('Target tabungan tidak ditemukan.', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'goals:put');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    // Kontribusi ikut terhapus via ON DELETE CASCADE; transaksi kas yang sudah nyata tidak disentuh.
    const rows = await query(
      `DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, session.userId]
    );

    if (rows.length === 0) {
      throw new BusinessError('Target tabungan tidak ditemukan.', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'goals:delete');
  }
}
