import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { walletSchema } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';
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
  } catch (error) {
    return handleRouteError(error, 'wallets:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = walletSchema.parse(await readJsonBody(req));

    // Unset default lama dan insert dompet baru harus atomik.
    const inserted = await withTransaction(async (client) => {
      if (validated.is_default) {
        await client.query('UPDATE wallets SET is_default = FALSE WHERE user_id = $1', [session.userId]);
      }
      const rows = await client.query<Wallet>(
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
      return rows.rows[0];
    });

    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    return handleRouteError(error, 'wallets:create');
  }
}
