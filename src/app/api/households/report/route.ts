import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { getMembership } from '@/lib/household';

/**
 * Laporan per-anggota: total pengeluaran/pemasukan tiap anggota
 * pada dompet bersama household untuk bulan tertentu.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const q = periodQuerySchema.parse({
      month: sp.get('month') ?? undefined,
      year: sp.get('year') ?? undefined,
    });
    const now = new Date();
    const month = q.month ?? now.getMonth() + 1;
    const year = q.year ?? now.getFullYear();

    const membership = await getMembership(session.userId);
    if (!membership) {
      throw new BusinessError('Anda belum tergabung dalam keluarga mana pun.', 404);
    }

    // Transfer dihitung sebagai kaki: keluar dari dompet bersama (penarikan) dan
    // masuk ke dompet bersama (setoran), agar iuran anggota tidak hilang dari laporan.
    const rows = await query(
      `SELECT
         u.id AS user_id, u.name,
         COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::float AS expense,
         COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::float AS income,
         COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.wallet_id IN (SELECT id FROM wallets WHERE household_id = $1) THEN t.amount ELSE 0 END), 0)::float AS transfer_out,
         COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.to_wallet_id IN (SELECT id FROM wallets WHERE household_id = $1) THEN t.amount ELSE 0 END), 0)::float AS transfer_in,
         COUNT(t.id)::int AS transaction_count
       FROM household_members hm
       JOIN users u ON hm.user_id = u.id
       LEFT JOIN transactions t
         ON t.user_id = hm.user_id
        AND t.date >= make_date($2::int, $3::int, 1)
        AND t.date < make_date($2::int, $3::int, 1) + INTERVAL '1 month'
        AND (
          (t.type IN ('expense', 'income') AND t.wallet_id IN (SELECT id FROM wallets WHERE household_id = $1))
          OR (t.type = 'transfer' AND (t.wallet_id IN (SELECT id FROM wallets WHERE household_id = $1) OR t.to_wallet_id IN (SELECT id FROM wallets WHERE household_id = $1)))
        )
       WHERE hm.household_id = $1
       GROUP BY u.id, u.name
       ORDER BY expense DESC`,
      [membership.household_id, year, month]
    );

    return NextResponse.json({ success: true, data: { month, year, members: rows } });
  } catch (error) {
    return handleRouteError(error, 'households:report');
  }
}
