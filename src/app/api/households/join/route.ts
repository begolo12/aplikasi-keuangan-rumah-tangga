import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { joinHouseholdSchema } from '@/lib/validations';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { getMembership } from '@/lib/household';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 20 percobaan gabung per jam per IP.
    const rl = checkRateLimit(`households-join:${getClientIp(req)}`, 20, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Terlalu banyak percobaan bergabung. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }

    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = joinHouseholdSchema.parse(await readJsonBody(req));

    const existing = await getMembership(session.userId);
    if (existing) {
      throw new BusinessError('Anda sudah tergabung dalam sebuah keluarga.');
    }

    const joined = await withTransaction(async (client) => {
      const hh = await client.query(
        'SELECT id FROM households WHERE invite_code = $1 FOR UPDATE',
        [validated.invite_code]
      );
      if (hh.rows.length === 0) {
        throw new BusinessError('Kode undangan tidak ditemukan atau sudah tidak berlaku.', 404);
      }
      const householdId = hh.rows[0].id;
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`,
        [householdId, session.userId]
      );
      return householdId;
    });

    return NextResponse.json({ success: true, data: { household_id: joined } }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'households:join');
  }
}
