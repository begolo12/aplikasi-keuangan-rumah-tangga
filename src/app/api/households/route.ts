import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { createHouseholdSchema } from '@/lib/validations';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { generateInviteCode, getMembership } from '@/lib/household';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const membership = await getMembership(session.userId);
    if (!membership) {
      return NextResponse.json({
        success: true,
        data: { household: null, role: null, members: [], new_activity_count: 0 },
      });
    }

    const [hhRes, memberRes, activityRes] = await Promise.all([
      query(`SELECT id, name, invite_code, created_at FROM households WHERE id = $1`, [membership.household_id]),
      query(
        `SELECT hm.user_id, u.name, u.email, hm.role::text AS role, hm.joined_at
         FROM household_members hm
         JOIN users u ON hm.user_id = u.id
         WHERE hm.household_id = $1
         ORDER BY hm.role = 'owner' DESC, hm.joined_at ASC`,
        [membership.household_id]
      ),
      query(
        `SELECT COUNT(*)::int AS cnt
         FROM transactions t
         JOIN wallets w ON t.wallet_id = w.id
         WHERE w.household_id = $1 AND t.user_id <> $2 AND t.created_at >= NOW() - INTERVAL '7 days'`,
        [membership.household_id, session.userId]
      ),
    ]);

    const household = hhRes[0] ?? null;
    const isOwner = membership.role === 'owner';
    return NextResponse.json({
      success: true,
      data: {
        household: household
          ? {
              id: household.id,
              name: household.name,
              created_at: household.created_at,
              // Kode undangan hanya boleh dilihat owner.
              ...(isOwner ? { invite_code: household.invite_code } : {}),
            }
          : null,
        role: membership.role,
        members: memberRes,
        new_activity_count: activityRes[0]?.cnt ?? 0,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'households:get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = createHouseholdSchema.parse(await readJsonBody(req));

    const existing = await getMembership(session.userId);
    if (existing) {
      throw new BusinessError('Anda sudah tergabung dalam sebuah keluarga. Keluar dulu sebelum membuat yang baru.');
    }

    const result = await withTransaction(async (client) => {
      // Coba beberapa kali bila kode undangan bentrok (probabilitas sangat kecil).
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const hh = await client.query(
            `INSERT INTO households (name, owner_user_id, invite_code) VALUES ($1, $2, $3) RETURNING id, name, invite_code, created_at`,
            [validated.name.trim(), session.userId, generateInviteCode()]
          );
          await client.query(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'owner')`, [
            hh.rows[0].id,
            session.userId,
          ]);
          return hh.rows[0];
        } catch (err) {
          const pgError = err as { code?: string };
          if (pgError.code === '23505') continue; // duplikat invite_code: coba lagi
          throw err;
        }
      }
      throw new BusinessError('Gagal membuat kode undangan unik. Coba lagi.');
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'households:create');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const membership = await getMembership(session.userId);
    if (!membership) {
      throw new BusinessError('Anda belum tergabung dalam keluarga mana pun.', 404);
    }

    await withTransaction(async (client) => {
      if (membership.role === 'owner') {
        // Owner membubarkan household; wallets.household_id otomatis NULL (ON DELETE SET NULL).
        await client.query('DELETE FROM households WHERE id = $1', [membership.household_id]);
      } else {
        await client.query('DELETE FROM household_members WHERE household_id = $1 AND user_id = $2', [
          membership.household_id,
          session.userId,
        ]);
      }
    });

    return NextResponse.json({ success: true, data: { left: true } });
  } catch (error) {
    return handleRouteError(error, 'households:delete');
  }
}
