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
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        (total_amount - paid_amount)::float AS remaining_amount,
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

    const rows = await query(
      `
      INSERT INTO debts (
        user_id,
        type,
        person_name,
        total_amount,
        paid_amount,
        due_date,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, 'unpaid')
      RETURNING 
        id,
        user_id,
        type,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        total_amount::float AS remaining_amount,
        due_date,
        notes,
        status,
        created_at,
        updated_at
      `,
      [
        user.userId,
        validated.type,
        validated.person_name,
        validated.total_amount,
        validated.due_date || null,
        validated.notes || null,
      ]
    );

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'debts:post');
  }
}
