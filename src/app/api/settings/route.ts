import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { settingsSchema } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';
import { AppSettings } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Upsert-and-select dalam satu transaksi: tidak ada celah check-then-insert.
    const settings = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO app_settings (user_id, family_name, currency)
         VALUES ($1, 'Keluarga Bahagia', 'IDR')
         ON CONFLICT (user_id) DO NOTHING`,
        [session.userId]
      );
      const rows = await client.query<AppSettings>(
        'SELECT * FROM app_settings WHERE user_id = $1',
        [session.userId]
      );
      return rows.rows[0];
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return handleRouteError(error, 'settings:get');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = settingsSchema.parse(await readJsonBody(req));

    // app_settings dan users harus berubah bersama.
    const updated = await withTransaction(async (client) => {
      const rows = await client.query<AppSettings>(
        `INSERT INTO app_settings (user_id, family_name, currency, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET family_name = EXCLUDED.family_name, currency = EXCLUDED.currency, updated_at = NOW()
         RETURNING *`,
        [session.userId, validated.family_name, validated.currency]
      );
      await client.query('UPDATE users SET family_name = $1 WHERE id = $2', [
        validated.family_name,
        session.userId,
      ]);
      return rows.rows[0];
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleRouteError(error, 'settings:put');
  }
}
