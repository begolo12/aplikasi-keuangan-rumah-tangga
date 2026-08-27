import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { recurringBillSchema, periodQuerySchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { RecurringBill } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const currentDay = now.getDate();
    const parsed = periodQuerySchema.parse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const month = parsed.month ?? now.getMonth() + 1;
    const year = parsed.year ?? now.getFullYear();

    // Join metadata diikat pemiliknya agar FK silang tak bisa menampilkan nama user lain.
    const bills = await query<Record<string, unknown>>(
      `SELECT
        b.id, b.user_id, COALESCE(b.type, 'expense') as type, b.title, b.amount, b.due_day, 
        b.category_id, b.wallet_id, COALESCE(b.auto_record, FALSE) as auto_record, b.is_active, b.created_at,
        c.name as category_name,
        w.name as wallet_name,
        bp.id as payment_id,
        bp.paid_date,
        CASE WHEN bp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid
      FROM recurring_bills b
      LEFT JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
      LEFT JOIN wallets w ON b.wallet_id = w.id AND w.user_id = b.user_id
      LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
      WHERE b.user_id = $1 AND b.is_active = TRUE
      ORDER BY is_paid ASC, b.due_day ASC`,
      [session.userId, month, year]
    );

    interface BillLike {
      is_paid: boolean;
      due_day: number;
      amount: string;
      type?: 'expense' | 'income';
      auto_record?: boolean;
      [key: string]: unknown;
    }

    const formattedBills: RecurringBill[] = (bills as unknown as BillLike[]).map((b) => {
      const isPaid = Boolean(b.is_paid);
      const dueDay = b.due_day;
      const daysUntilDue = dueDay - currentDay;
      let status: RecurringBill['status'] = 'upcoming';

      if (isPaid) status = 'paid';
      else if (currentDay === dueDay) status = 'due_today';
      else if (currentDay > dueDay) status = 'overdue';
      else if (daysUntilDue <= 3) status = 'due_soon';

      return {
        ...(b as unknown as RecurringBill),
        type: b.type === 'income' ? 'income' : 'expense',
        auto_record: Boolean(b.auto_record),
        amount: parseFloat(b.amount),
        days_until_due: daysUntilDue,
        status,
        is_paid: isPaid,
      };
    });

    return NextResponse.json({ success: true, data: formattedBills });
  } catch (error) {
    return handleRouteError(error, 'bills:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = recurringBillSchema.parse(await readJsonBody(req));

    const inserted = await withTransaction(async (client) => {
      if (validated.category_id) {
        const ownedCat = await client.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [
          validated.category_id,
          session.userId,
        ]);
        if (ownedCat.rows.length === 0) throw new BusinessError('Kategori tidak ditemukan pada akun Anda.');
      }
      if (validated.wallet_id) {
        const ownedWallet = await client.query('SELECT 1 FROM wallets WHERE id = $1 AND user_id = $2', [
          validated.wallet_id,
          session.userId,
        ]);
        if (ownedWallet.rows.length === 0) throw new BusinessError('Dompet tidak ditemukan pada akun Anda.');
      }
      const rows = await client.query<RecurringBill>(
        `INSERT INTO recurring_bills (user_id, type, title, amount, due_day, category_id, wallet_id, auto_record, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          session.userId,
          validated.type,
          validated.title,
          validated.amount,
          validated.due_day,
          validated.category_id || null,
          validated.wallet_id || null,
          validated.auto_record,
          validated.is_active,
        ]
      );
      return rows.rows[0];
    });

    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    return handleRouteError(error, 'bills:create');
  }
}
