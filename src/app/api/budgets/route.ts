import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { budgetSchema, periodQuerySchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { Budget } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const now = new Date();
    const parsed = periodQuerySchema.parse({
      month: sp.get('month') ?? undefined,
      year: sp.get('year') ?? undefined,
    });
    const month = parsed.month ?? now.getMonth() + 1;
    const year = parsed.year ?? now.getFullYear();

    // Ambil anggaran aktif untuk setiap kategori dengan mekanisme auto carry-forward dari batas terakhir,
    // serta hitung realisasi spent khusus untuk bulan & tahun yang diminta secara live.
    const budgets = await query<Budget>(
      `WITH latest_budgets AS (
        SELECT DISTINCT ON (category_id)
          id, user_id, category_id, monthly_limit, month, year, created_at
        FROM budgets
        WHERE user_id = $1
          AND (year < $3 OR (year = $3 AND month <= $2))
        ORDER BY category_id, year DESC, month DESC
      )
      SELECT
        b.id, b.user_id, b.category_id, b.monthly_limit, $2::smallint as month, $3::smallint as year, b.created_at,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
        (b.monthly_limit - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
        CASE 
          WHEN b.monthly_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / b.monthly_limit * 100)::NUMERIC, 1)::FLOAT 
          ELSE 0 
        END as percentage
      FROM latest_budgets b
      JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
      LEFT JOIN transactions t ON t.category_id = b.category_id
        AND t.type = 'expense'
        AND t.user_id = b.user_id
        AND EXTRACT(MONTH FROM t.date) = $2
        AND EXTRACT(YEAR FROM t.date) = $3
      GROUP BY b.id, b.user_id, b.category_id, b.monthly_limit, b.created_at, c.name, c.icon, c.color
      ORDER BY percentage DESC, b.monthly_limit DESC`,
      [session.userId, month, year]
    );

    return NextResponse.json({ success: true, data: budgets });
  } catch (error) {
    return handleRouteError(error, 'budgets:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = budgetSchema.parse(await readJsonBody(req));

    const inserted = await withTransaction(async (client) => {
      const owned = await client.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [
        validated.category_id,
        session.userId,
      ]);
      if (owned.rows.length === 0) {
        throw new BusinessError('Kategori tidak ditemukan pada akun Anda.');
      }
      const rows = await client.query<Budget>(
        `INSERT INTO budgets (user_id, category_id, monthly_limit, month, year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, category_id, month, year)
         DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
         RETURNING *`,
        [session.userId, validated.category_id, validated.monthly_limit, validated.month, validated.year]
      );
      return rows.rows[0];
    });

    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    return handleRouteError(error, 'budgets:create');
  }
}
