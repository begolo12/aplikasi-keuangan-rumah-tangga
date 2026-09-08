import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { merchantMapSchema } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';

/**
 * Simpan pembaruan pemetaan merchant -> kategori hasil kebiasaan user.
 * Dipanggil TransactionModal setelah transaksi struk AI tersimpan:
 * - was_override = false: kategori yang diusulkan AI diterima (confidence naik).
 * - was_override = true : user mengganti kategori (mapping diperbarui).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = merchantMapSchema.parse(await readJsonBody(req));
    const merchant = validated.merchant_name.trim();

    // Kategori wajib milik user ini.
    const owned = await query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [
      validated.category_id,
      session.userId,
    ]);
    if (owned.length === 0) {
      return NextResponse.json({ success: false, error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    await query(
      `INSERT INTO merchant_category_map (user_id, merchant_name, category_id, correct_count, override_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, merchant_name) DO UPDATE SET
         category_id = CASE WHEN EXCLUDED.correct_count = 0 THEN EXCLUDED.category_id ELSE merchant_category_map.category_id END,
         correct_count = merchant_category_map.correct_count + EXCLUDED.correct_count,
         override_count = merchant_category_map.override_count + EXCLUDED.override_count,
         updated_at = NOW()`,
      [
        session.userId,
        merchant,
        validated.category_id,
        validated.was_override ? 0 : 1,
        validated.was_override ? 1 : 0,
      ]
    );

    return NextResponse.json({ success: true, data: { learned: true } });
  } catch (error) {
    return handleRouteError(error, 'ai:merchant-map');
  }
}
