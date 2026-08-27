import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { debtSchema, debtQuerySchema } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const rawType = searchParams.get('type') || undefined;
    const rawStatus = searchParams.get('status') || undefined;

    const parsedQuery = debtQuerySchema.safeParse({ type: rawType, status: rawStatus });
    const { type, status } = parsedQuery.success ? parsedQuery.data : {};

    let sql = `
      SELECT 
        id,
        user_id,
        type,
        category,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        (total_amount - paid_amount)::float AS remaining_amount,
        principal_amount::float AS principal_amount,
        interest_rate::float AS interest_rate,
        interest_type,
        tenor_months,
        monthly_installment::float AS monthly_installment,
        total_interest::float AS total_interest,
        due_date,
        notes,
        status,
        CASE 
          WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
          ELSE NULL 
        END AS days_until_due,
        CASE 
          WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
          ELSE FALSE 
        END AS is_overdue,
        created_at,
        updated_at
      FROM debts
      WHERE user_id = $1
    `;

    const params: unknown[] = [user.userId];
    let pIdx = 2;

    if (type) {
      sql += ` AND type = $${pIdx}`;
      params.push(type);
      pIdx++;
    }

    if (status) {
      sql += ` AND status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    sql += ` ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`;

    const rows = await query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return handleRouteError(error, 'debts:get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await readJsonBody(req);
    const validated = debtSchema.parse(body);

    const principal = validated.principal_amount || validated.total_amount;
    const totalAmount = validated.total_amount;
    const totalInterest = Math.max(0, totalAmount - principal);

    const rows = await query(
      `
      INSERT INTO debts (
        user_id,
        type,
        category,
        person_name,
        total_amount,
        paid_amount,
        principal_amount,
        interest_rate,
        interest_type,
        tenor_months,
        monthly_installment,
        total_interest,
        due_date,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $11, $12, $13, 'unpaid')
      RETURNING 
        id,
        user_id,
        type,
        category,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        total_amount::float AS remaining_amount,
        principal_amount::float AS principal_amount,
        interest_rate::float AS interest_rate,
        interest_type,
        tenor_months,
        monthly_installment::float AS monthly_installment,
        total_interest::float AS total_interest,
        due_date,
        notes,
        status,
        created_at,
        updated_at
      `,
      [
        user.userId,
        validated.type,
        validated.category || 'hutang_pribadi',
        validated.person_name,
        totalAmount,
        principal,
        validated.interest_rate || 0,
        validated.interest_type || 'flat',
        validated.tenor_months || null,
        validated.monthly_installment || null,
        totalInterest,
        validated.due_date || null,
        validated.notes || null,
      ]
    );

    const createdDebt = rows[0];

    // Jika auto_schedule_bill aktif pada hutang (payable), buat jadwal cicilan rutin ke recurring_bills
    if (validated.type === 'payable' && validated.auto_schedule_bill && validated.monthly_installment) {
      await query(
        `INSERT INTO recurring_bills (
          user_id, type, title, amount, due_day, wallet_id, auto_record, is_active
        ) VALUES ($1, 'expense', $2, $3, $4, $5, TRUE, TRUE)`,
        [
          user.userId,
          `Cicilan: ${validated.person_name}`,
          validated.monthly_installment,
          validated.schedule_due_day || 10,
          validated.wallet_id || null,
        ]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, data: createdDebt }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'debts:post');
  }
}
