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
         SET type = $1, title = $2, amount = $3, due_day = $4, category_id = $5, wallet_id = $6, auto_record = $7, is_active = $8
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [
          validated.type,
          validated.title,
          validated.amount,
          validated.due_day,
          validated.category_id || null,
          validated.wallet_id || null,
          validated.auto_record,
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
    // Bila tagihan terhubung ke hutang, paid_amount hutang dikembalikan sebesar
    // baris sinkronisasi otomatis yang ikut terhapus (jurnal-balik, bukan dibiarkan menggantung).
    await withTransaction(async (client) => {
      const billRows = await client.query(
        'SELECT id, debt_id FROM recurring_bills WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );
      if (billRows.rows.length === 0) {
        throw new BusinessError('Tagihan tidak ditemukan', 404);
      }
      const debtId = billRows.rows[0]?.debt_id ?? null;
      if (debtId) {
        await client.query('SELECT id FROM debts WHERE id = $1 AND user_id = $2 FOR UPDATE', [debtId, session.userId]);
        const paidMonths = await client.query(
          'SELECT month, year FROM bill_payments WHERE bill_id = $1 AND user_id = $2',
          [id, session.userId]
        );
        let reversed = 0;
        if (paidMonths.rows.length > 0) {
          const pairs = paidMonths.rows.map((r) => `(${Number(r.month)},${Number(r.year)})`).join(',');
          const autoRows = await client.query(
            `DELETE FROM debt_payments
             WHERE debt_id = $1 AND user_id = $2
               AND (notes = 'Pembayaran cicilan via tagihan' OR notes LIKE 'Cicilan berjalan (%')
               AND (EXTRACT(MONTH FROM payment_date)::int, EXTRACT(YEAR FROM payment_date)::int) IN (${pairs})
             RETURNING amount`,
            [debtId, session.userId]
          );
          reversed = autoRows.rows.reduce((acc, r) => acc + Number(r.amount), 0);
        }
        await client.query(
          `UPDATE debts
           SET paid_amount = GREATEST(0, paid_amount - $1),
               status = CASE
                 WHEN GREATEST(0, paid_amount - $1) >= total_amount THEN 'paid'
                 WHEN GREATEST(0, paid_amount - $1) > 0 THEN 'partial'
                 ELSE 'unpaid'
               END,
               updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [reversed, debtId, session.userId]
        );
      }
      await client.query('DELETE FROM bill_payments WHERE bill_id = $1 AND user_id = $2', [id, session.userId]);
      await client.query('DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2', [id, session.userId]);
    });
    return NextResponse.json({ success: true, message: 'Tagihan berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'bills:delete');
  }
}

