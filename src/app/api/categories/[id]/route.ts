import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { categorySchema } from '@/lib/validations';
import { Category } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const validated = categorySchema.parse(body);

    const updated = await query<Category>(
      `UPDATE categories
       SET name = $1, type = $2, icon = $3, color = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [validated.name, validated.type, validated.icon, validated.color, id, session.userId]
    );

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Update category error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, session.userId]);

    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
