import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { recurringBillSchema } from '@/lib/validations';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const validated = recurringBillSchema.parse(body);

    const updated = await query(
      `UPDATE recurring_bills
       SET title = $1, amount = $2, due_day = $3, category_id = $4, wallet_id = $5, is_active = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        validated.title,
        validated.amount,
        validated.due_day,
        validated.category_id || null,
        validated.wallet_id || null,
        validated.is_active,
        id,
        session.userId,
      ]
    );

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Update bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await query('DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2', [id, session.userId]);

    return NextResponse.json({ success: true, message: 'Tagihan berhasil dihapus' });
  } catch (error: any) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
