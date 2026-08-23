import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { recurringBillSchema } from '@/lib/validations';
import { RecurringBill } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const currentDay = now.getDate();
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);

    const bills = await query<any>(
      `SELECT 
        b.id, b.user_id, b.title, b.amount, b.due_day, b.category_id, b.wallet_id, b.is_active, b.created_at,
        c.name as category_name,
        w.name as wallet_name,
        bp.id as payment_id,
        bp.paid_date,
        CASE WHEN bp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid
      FROM recurring_bills b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN wallets w ON b.wallet_id = w.id
      LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
      WHERE b.user_id = $1 AND b.is_active = TRUE
      ORDER BY is_paid ASC, b.due_day ASC`,
      [session.userId, month, year]
    );

    // Compute smart status per bill
    const formattedBills: RecurringBill[] = bills.map((b) => {
      const isPaid = Boolean(b.is_paid);
      const dueDay = b.due_day;
      let status: RecurringBill['status'] = 'upcoming';
      let daysUntilDue = dueDay - currentDay;

      if (isPaid) {
        status = 'paid';
      } else if (currentDay === dueDay) {
        status = 'due_today';
      } else if (currentDay > dueDay) {
        status = 'overdue';
      } else if (daysUntilDue <= 3) {
        status = 'due_soon';
      } else {
        status = 'upcoming';
      }

      return {
        id: b.id,
        user_id: b.user_id,
        title: b.title,
        amount: parseFloat(b.amount),
        due_day: b.due_day,
        category_id: b.category_id,
        category_name: b.category_name,
        wallet_id: b.wallet_id,
        wallet_name: b.wallet_name,
        is_active: b.is_active,
        is_paid: isPaid,
        paid_date: b.paid_date,
        days_until_due: daysUntilDue,
        status,
        created_at: b.created_at,
      };
    });

    return NextResponse.json({ success: true, data: formattedBills });
  } catch (error: any) {
    console.error('Get bills error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = recurringBillSchema.parse(body);

    const inserted = await query<RecurringBill>(
      `INSERT INTO recurring_bills (user_id, title, amount, due_day, category_id, wallet_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        session.userId,
        validated.title,
        validated.amount,
        validated.due_day,
        validated.category_id || null,
        validated.wallet_id || null,
        validated.is_active,
      ]
    );

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Create bill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
