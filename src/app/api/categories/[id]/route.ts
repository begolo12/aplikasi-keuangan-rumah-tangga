import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { categorySchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { Category } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);
    const validated = categorySchema.parse(await readJsonBody(req));

    const updated = await withTransaction(async (client) => {
      const rows = await client.query<Category>(
        `UPDATE categories
         SET name = $1, type = $2, icon = $3, color = $4
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [validated.name, validated.type, validated.icon, validated.color, id, session.userId]
      );
      return rows.rows[0] ?? null;
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleRouteError(error, 'categories:put');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    // Safety check dan delete dalam satu transaksi untuk menutup celah race.
    const deleted = await withTransaction(async (client) => {
      const usedInTrx = await client.query(
        `SELECT id FROM transactions WHERE category_id = $1 AND user_id = $2 LIMIT 1`,
        [id, session.userId]
      );
      if (usedInTrx.rows.length > 0) return null;

      const rows = await client.query(
        `DELETE FROM categories
         WHERE id = $1 AND user_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM transactions t WHERE t.category_id = categories.id AND t.user_id = $2
           )
           AND NOT EXISTS (
             SELECT 1 FROM budgets b WHERE b.category_id = categories.id AND b.user_id = $2
           )
         RETURNING id`,
        [id, session.userId]
      );
      return rows.rows[0] ?? null;
    });

    if (!deleted) {
      throw new BusinessError(
        'Kategori ini masih dipakai oleh transaksi atau anggaran dan tidak dapat dihapus. Anda dapat mengubah nama atau ikonnya.'
      );
    }

    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'categories:delete');
  }
}
