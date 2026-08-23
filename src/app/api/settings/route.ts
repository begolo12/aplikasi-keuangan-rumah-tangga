import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { settingsSchema } from '@/lib/validations';
import { AppSettings } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const settings = await query<AppSettings>(
      'SELECT * FROM app_settings WHERE user_id = $1',
      [session.userId]
    );

    if (settings.length === 0) {
      const inserted = await query<AppSettings>(
        `INSERT INTO app_settings (user_id, family_name, currency)
         VALUES ($1, 'Keluarga Bahagia', 'IDR')
         RETURNING *`,
        [session.userId]
      );
      return NextResponse.json({ success: true, data: inserted[0] });
    }

    return NextResponse.json({ success: true, data: settings[0] });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = settingsSchema.parse(body);

    const updated = await query<AppSettings>(
      `INSERT INTO app_settings (user_id, family_name, currency, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET family_name = EXCLUDED.family_name, currency = EXCLUDED.currency, updated_at = NOW()
       RETURNING *`,
      [session.userId, validated.family_name, validated.currency]
    );

    // Also update family_name in users table
    await query('UPDATE users SET family_name = $1 WHERE id = $2', [validated.family_name, session.userId]);

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
