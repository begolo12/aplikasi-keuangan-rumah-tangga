import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { budgetSchema } from '@/lib/validations';
import { Budget } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);

    const budgets = await query<Budget>(
      `SELECT 
        b.id, b.user_id, b.category_id, b.monthly_limit, b.month, b.year, b.created_at,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
        (b.monthly_limit - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
        ROUND((COALESCE(SUM(t.amount), 0) / b.monthly_limit * 100)::NUMERIC, 1)::FLOAT as percentage
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.type = 'expense'
        AND t.user_id = b.user_id
        AND EXTRACT(MONTH FROM t.date) = b.month
        AND EXTRACT(YEAR FROM t.date) = b.year
      WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
      GROUP BY b.id, b.user_id, b.category_id, b.monthly_limit, b.month, b.year, b.created_at, c.name, c.icon, c.color
      ORDER BY percentage DESC, b.monthly_limit DESC`,
      [session.userId, month, year]
    );

    return NextResponse.json({ success: true, data: budgets });
  } catch (error: any) {
    console.error('Get budgets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = budgetSchema.parse(body);

    const inserted = await query<Budget>(
      `INSERT INTO budgets (user_id, category_id, monthly_limit, month, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category_id, month, year)
       DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
       RETURNING *`,
      [session.userId, validated.category_id, validated.monthly_limit, validated.month, validated.year]
    );

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Create budget error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
