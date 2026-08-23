import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
    const type = searchParams.get('type') || 'expense';

    const categoryBreakdown = await query<{
      category_id: string;
      name: string;
      icon: string;
      color: string;
      total_amount: string;
      transaction_count: string;
    }>(
      `SELECT 
        COALESCE(c.id::text, 'other') as category_id,
        COALESCE(c.name, 'Lain-lain') as name,
        COALESCE(c.icon, 'dots-three') as icon,
        COALESCE(c.color, 'gray') as color,
        SUM(t.amount)::text as total_amount,
        COUNT(t.id)::text as transaction_count
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 
         AND t.type = $2 
         AND EXTRACT(MONTH FROM t.date) = $3 
         AND EXTRACT(YEAR FROM t.date) = $4
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY SUM(t.amount) DESC`,
      [session.userId, type, month, year]
    );

    const totalSum = categoryBreakdown.reduce((acc, cur) => acc + parseFloat(cur.total_amount), 0);

    const data = categoryBreakdown.map((item) => {
      const amount = parseFloat(item.total_amount);
      return {
        id: item.category_id,
        name: item.name,
        icon: item.icon,
        color: item.color,
        amount,
        count: parseInt(item.transaction_count, 10),
        percentage: totalSum > 0 ? parseFloat(((amount / totalSum) * 100).toFixed(1)) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        total: totalSum,
        categories: data,
      },
    });
  } catch (error: any) {
    console.error('Get category report error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
