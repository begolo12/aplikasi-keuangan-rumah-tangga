import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { recurringBillSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

/**
 * Verifikasi bahwa setiap referensi yang dikirim user memang miliknya.
 * Mencegah FK silang lintas user yang bisa membocorkan metadata.
 */
async function assertRefsOwned(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  userId: string,
  categoryId: string | null | undefined,
  walletId: string | null | undefined
): Promise<void> {
  if (categoryId) {
    const rows = await client.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
    if (rows.rows.length === 0) throw new BusinessError('Kategori tidak ditemukan pada akun Anda.');
  }
  if (walletId) {
    const rows = await client.query('SELECT 1 FROM wallets WHERE id = $1 AND user_id = $2', [walletId, userId]);
    if (rows.rows.length === 0) throw new BusinessError('Dompet tidak ditemukan pada akun Anda.');
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);
    const validated = recurringBillSchema.parse(await readJsonBody(req));

    const updated = await withTransaction(async (client) => {
      await assertRefsOwned(client, session.userId, validated.category_id, validated.wallet_id);
      const rows = await client.query(
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
      return rows.rows[0] ?? null;
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleRouteError(error, 'bills:put');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    uuidIdParam.parse(id);

    // Payment log dan bill dihapus bersama dalam satu transaksi.
    await withTransaction(async (client) => {
      await client.query('DELETE FROM bill_payments WHERE bill_id = $1 AND user_id = $2', [id, session.userId]);
      await client.query('DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2', [id, session.userId]);
    });
    return NextResponse.json({ success: true, message: 'Tagihan berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'bills:delete');
  }
}

