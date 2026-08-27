import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { savingsGoalSchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

const GOALS_QUERY = `
  WITH agg AS (
    SELECT
      g.id,
      SUM(CASE WHEN gc.date >= CURRENT_DATE - INTERVAL '90 days' THEN gc.amount ELSE 0 END) AS recent_90d
    FROM savings_goals g
    LEFT JOIN goal_contributions gc ON gc.goal_id = g.id AND gc.user_id = g.user_id
    GROUP BY g.id
  )
  SELECT
    g.id, g.user_id, g.name,
    g.target_amount::float AS target_amount,
    COALESCE(SUM(gc.amount), 0)::float AS saved_amount,
    (g.target_amount - COALESCE(SUM(gc.amount), 0))::float AS remaining_amount,
    CASE WHEN g.target_amount > 0 THEN
      ROUND((COALESCE(SUM(gc.amount), 0) / g.target_amount * 100)::numeric, 1)::float
      ELSE 0 END AS percentage,
    -- Rata-rata kontribusi per bulan dari 90 hari terakhir (basis proyeksi ETA)
    ROUND((agg.recent_90d / 3.0))::float AS monthly_progress,
    -- Estimasi bulan menuju target bila kontribusi berlanjut sama
    CASE WHEN COALESCE(SUM(gc.amount), 0) < g.target_amount AND agg.recent_90d > 0
      THEN CEIL(((g.target_amount - COALESCE(SUM(gc.amount), 0)) / (agg.recent_90d / 3.0)))::float
      ELSE NULL END AS months_left_to_target,
    w.name AS wallet_name,
    g.wallet_id, g.target_date, g.notes, g.is_active, g.created_at, g.updated_at
  FROM savings_goals g
  LEFT JOIN wallets w ON g.wallet_id = w.id AND w.user_id = g.user_id
  LEFT JOIN goal_contributions gc ON gc.goal_id = g.id AND gc.user_id = g.user_id
  JOIN agg ON agg.id = g.id
`;

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const rows = await query(
      `${GOALS_QUERY}
       WHERE g.user_id = $1
       GROUP BY g.id, w.name, agg.recent_90d
       ORDER BY g.is_active DESC, g.created_at ASC`,
      [session.userId]
    );

    return NextResponse.json({ success: true, data: { goals: rows } });
  } catch (error) {
    return handleRouteError(error, 'goals:get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = savingsGoalSchema.parse(await readJsonBody(req));

    if (validated.wallet_id) {
      const owned = await query('SELECT id FROM wallets WHERE id = $1 AND user_id = $2', [
        validated.wallet_id,
        session.userId,
      ]);
      if (owned.length === 0) {
        throw new BusinessError('Dompet tujuan tidak ditemukan.', 404);
      }
    }

    const rows = await query(
      `INSERT INTO savings_goals (user_id, name, target_amount, target_date, wallet_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, target_amount::float AS target_amount, target_date, wallet_id, notes,
                 is_active, created_at, updated_at,
                 0::float AS saved_amount, target_amount::float AS remaining_amount, 0::float AS percentage`,
      [session.userId, validated.name, validated.target_amount, validated.target_date || null, validated.wallet_id || null, validated.notes || null]
    );

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'goals:post');
  }
}
