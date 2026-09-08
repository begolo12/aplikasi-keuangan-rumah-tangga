import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Get all active subscriptions with charge dates in specified month/year
    const subs = await query<Record<string, unknown>>(
      `SELECT 
        s.id, s.provider_name, s.amount, s.cycle, s.next_charge_date,
        c.name as category_name, w.name as wallet_name, s.is_active
      FROM subscriptions s
      LEFT JOIN categories c ON s.category_id = c.id AND c.user_id = s.user_id
      LEFT JOIN wallets w ON s.wallet_id = w.id AND w.user_id = s.user_id
      WHERE s.user_id = $1 
        AND s.is_active = TRUE
        AND EXTRACT(YEAR FROM s.next_charge_date) = $2
        AND EXTRACT(MONTH FROM s.next_charge_date) = $3
      ORDER BY s.next_charge_date ASC`,
      [session.userId, year, month]
    );

    const formatted = (subs as any[]).map((s) => ({
      id: String(s.id),
      provider_name: String(s.provider_name),
      amount: parseFloat(String(s.amount)),
      cycle: s.cycle,
      date: String(s.next_charge_date),
      category_name: s.category_name ? String(s.category_name) : null,
      wallet_name: s.wallet_name ? String(s.wallet_name) : null,
      is_active: Boolean(s.is_active),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:calendar');
  }
}
