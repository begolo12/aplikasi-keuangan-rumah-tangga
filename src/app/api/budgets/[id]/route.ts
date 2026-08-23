import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const updateBudgetSchema = z.object({
  monthly_limit: z.number().positive('Batas anggaran harus lebih dari 0'),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const validated = updateBudgetSchema.parse(body);

    const updated = await query(
      `UPDATE budgets
       SET monthly_limit = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [validated.monthly_limit, id, session.userId]
    );

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Anggaran tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Update budget error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [id, session.userId]);

    return NextResponse.json({ success: true, message: 'Anggaran berhasil dihapus' });
  } catch (error: any) {
    console.error('Delete budget error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
