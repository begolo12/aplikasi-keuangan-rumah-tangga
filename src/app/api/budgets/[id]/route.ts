import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { uuidIdParam } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';

const updateBudgetSchema = z.object({
  monthly_limit: z.number().positive('Batas anggaran harus lebih dari 0'),
  rollover_enabled: z.boolean().default(false),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);
    const validated = updateBudgetSchema.parse(await readJsonBody(req));

    const updated = await query(
      `UPDATE budgets
       SET monthly_limit = $1, rollover_enabled = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [validated.monthly_limit, validated.rollover_enabled, id, session.userId]
    );

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Anggaran tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return handleRouteError(error, 'budgets:put');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    await query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [id, session.userId]);

    return NextResponse.json({ success: true, message: 'Anggaran berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'budgets:delete');
  }
}
