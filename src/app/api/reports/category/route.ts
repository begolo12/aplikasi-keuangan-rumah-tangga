import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';

const categoryReportQuery = z.object({
  type: z.enum(['expense', 'income']).default('expense'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const parsedPeriod = periodQuerySchema.parse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const parsedType = categoryReportQuery.parse({ type: searchParams.get('type') ?? undefined });
    const month = parsedPeriod.month ?? now.getMonth() + 1;
    const year = parsedPeriod.year ?? now.getFullYear();

    // Join kategori diikat pemiliknya agar metadata lintas user tak mungkin bocor.
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
       LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
       WHERE t.user_id = $1
         AND t.type = $2
         AND EXTRACT(MONTH FROM t.date) = $3
         AND EXTRACT(YEAR FROM t.date) = $4
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY SUM(t.amount) DESC`,
      [session.userId, parsedType.type, month, year]
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
  } catch (error) {
    return handleRouteError(error, 'reports:category');
  }
}
