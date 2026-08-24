import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { debtSchema, uuidIdParam } from '@/lib/validations';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const debtId = uuidIdParam.parse(id);

    const debts = await query(
      `
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
      WHERE id = $1 AND user_id = $2
      `,
      [debtId, user.userId]
    );

    if (debts.length === 0) {
      throw new BusinessError('Data hutang/piutang tidak ditemukan.', 404);
    }

    const payments = await query(
      `
      SELECT 
        dp.id,
        dp.debt_id,
        dp.user_id,
        dp.wallet_id,
        w.name AS wallet_name,
        dp.amount::float AS amount,
        dp.payment_date,
        dp.notes,
        dp.created_at
      FROM debt_payments dp
      LEFT JOIN wallets w ON dp.wallet_id = w.id
      WHERE dp.debt_id = $1 AND dp.user_id = $2
      ORDER BY dp.payment_date DESC, dp.created_at DESC
      `,
      [debtId, user.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...debts[0],
        payments,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'debts:get-one');
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const debtId = uuidIdParam.parse(id);

    const body = await readJsonBody(req);
    const validated = debtSchema.parse(body);

    const rows = await query(
      `
      UPDATE debts
      SET 
        type = $1,
        person_name = $2,
        total_amount = $3,
        due_date = $4,
        notes = $5,
        status = CASE 
          WHEN paid_amount >= $3 THEN 'paid'
          WHEN paid_amount > 0 THEN 'partial'
          ELSE 'unpaid'
        END,
        updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING 
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
        created_at,
        updated_at
      `,
      [
        validated.type,
        validated.person_name,
        validated.total_amount,
        validated.due_date || null,
        validated.notes || null,
        debtId,
        user.userId,
      ]
    );

    if (rows.length === 0) {
      throw new BusinessError('Data hutang/piutang tidak ditemukan.', 404);
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return handleRouteError(error, 'debts:put');
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const debtId = uuidIdParam.parse(id);

    const rows = await query(
      `DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [debtId, user.userId]
    );

    if (rows.length === 0) {
      throw new BusinessError('Data hutang/piutang tidak ditemukan.', 404);
    }

    return NextResponse.json({ success: true, message: 'Hutang/piutang berhasil dihapus.' });
  } catch (error) {
    return handleRouteError(error, 'debts:delete');
  }
}
