import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { uuidIdParam, savingsGoalSchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

/**
 * Ikat dompet penampung ke goal (dompet amplop): bersihkan binding lama,
 * lalu arahkan linked_goal_id dompet terpilih ke goal ini.
 */
async function bindEnvelopeWallet(goalId: string, walletId: string | null, userId: string) {
  await query(`UPDATE wallets SET linked_goal_id = NULL WHERE linked_goal_id = $1 AND user_id = $2`, [goalId, userId]);
  if (walletId) {
    const target = await query('SELECT id, linked_goal_id FROM wallets WHERE id = $1 AND user_id = $2', [walletId, userId]);
    if (target.length === 0) {
      throw new BusinessError('Dompet tujuan tidak ditemukan.', 404);
    }
    const boundGoal = target[0]?.linked_goal_id ?? null;
    if (boundGoal && boundGoal !== goalId) {
      throw new BusinessError('Dompet ini sudah menjadi penampung target lain. Lepaskan dulu dari target tersebut.', 409);
    }
    await query(`UPDATE wallets SET linked_goal_id = $1 WHERE id = $2 AND user_id = $3`, [
      goalId,
      walletId,
      userId,
    ]);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    const validated = savingsGoalSchema.parse(await readJsonBody(req));
    if (validated.wallet_id) {
      const owned = await query('SELECT id, linked_goal_id FROM wallets WHERE id = $1 AND user_id = $2', [
        validated.wallet_id,
        session.userId,
      ]);
      if (owned.length === 0) {
        throw new BusinessError('Dompet tujuan tidak ditemukan.', 404);
      }
      const boundGoal = owned[0]?.linked_goal_id ?? null;
      if (boundGoal && boundGoal !== id) {
        throw new BusinessError('Dompet ini sudah menjadi penampung target lain. Lepaskan dulu dari target tersebut.', 409);
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

    await bindEnvelopeWallet(id, validated.wallet_id || null, session.userId);

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
    // Binding dompet amplop ikut lepas via ON DELETE SET NULL pada wallets.linked_goal_id.
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
