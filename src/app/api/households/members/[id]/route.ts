import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { getMembership } from '@/lib/household';

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(_req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id: memberUserId } = await ctx.params;
    const membership = await getMembership(session.userId);
    if (!membership || membership.role !== 'owner') {
      throw new BusinessError('Hanya pemilik keluarga yang dapat mengeluarkan anggota.', 403);
    }

    const result = await withTransaction(async (client) => {
      // Owner tidak bisa mengeluarkan dirinya sendiri; bubar keluarga lewat DELETE /api/households.
      const rows = await client.query(
        `DELETE FROM household_members
         WHERE household_id = $1 AND user_id = $2 AND role = 'member'
         RETURNING user_id`,
        [membership.household_id, memberUserId]
      );
      return rows.rows;
    });

    if (result.length === 0) {
      throw new BusinessError('Anggota tidak ditemukan.', 404);
    }

    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error) {
    return handleRouteError(error, 'households:remove-member');
  }
}
