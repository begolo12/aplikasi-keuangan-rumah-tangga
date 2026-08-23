import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { walletSchema } from '@/lib/validations';
import { Wallet } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const wallets = await query<Wallet>(
      `SELECT * FROM wallets WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [session.userId]
    );

    return NextResponse.json({ success: true, data: wallets });
  } catch (error: any) {
    console.error('Get wallets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = walletSchema.parse(body);

    // If set as default, unset other defaults
    if (validated.is_default) {
      await query(`UPDATE wallets SET is_default = FALSE WHERE user_id = $1`, [session.userId]);
    }

    const inserted = await query<Wallet>(
      `INSERT INTO wallets (user_id, name, type, balance, icon, color, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        session.userId,
        validated.name,
        validated.type,
        validated.balance,
        validated.icon,
        validated.color,
        validated.is_default,
      ]
    );

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Create wallet error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
