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
        start_date,
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

    const principal = validated.principal_amount ?? validated.total_amount;
    if (principal > validated.total_amount) throw new BusinessError('Pokok hutang tidak boleh melebihi total nominal.');
    const totalInterest = Math.max(0, validated.total_amount - principal);

    // Jurnal pengaman: total baru tidak boleh lebih kecil dari yang sudah terbayar,
    // dan paid awal eksplisit harus dalam rentang 0..total (mencegah histori menggantung).
    const curDebt = await query('SELECT paid_amount::float AS paid_amount FROM debts WHERE id = $1 AND user_id = $2', [debtId, user.userId]);
    if (curDebt.length === 0) {
      throw new BusinessError('Data hutang/piutang tidak ditemukan.', 404);
    }
    const curPaid = Number(curDebt[0]?.paid_amount) || 0;
    if (validated.total_amount < curPaid) {
      throw new BusinessError(`Total nominal tidak boleh lebih kecil dari yang sudah terbayar (${curPaid.toLocaleString('id-ID')}).`, 400);
    }
    if (
      validated.initial_paid_amount !== undefined &&
      validated.initial_paid_amount !== null &&
      (validated.initial_paid_amount < 0 || validated.initial_paid_amount > validated.total_amount)
    ) {
      throw new BusinessError('Nominal terbayar awal harus di antara 0 dan total nominal.', 400);
    }

    const rows = await query(
      `
      UPDATE debts
      SET
        type = $1,
        category = $2,
        person_name = $3,
        total_amount = $4,
        principal_amount = $5,
        interest_rate = $6,
        interest_type = $7,
        tenor_months = $8,
        monthly_installment = $9,
        total_interest = $10,
        start_date = $11,
        due_date = $12,
        notes = $13,
        paid_amount = CASE 
          WHEN $14::numeric IS NOT NULL THEN $14::numeric 
          ELSE paid_amount 
        END,
        status = CASE
          WHEN (CASE WHEN $14::numeric IS NOT NULL THEN $14::numeric ELSE paid_amount END) >= $4 THEN 'paid'
          WHEN (CASE WHEN $14::numeric IS NOT NULL THEN $14::numeric ELSE paid_amount END) > 0 THEN 'partial'
          ELSE 'unpaid'
        END,
        updated_at = NOW()
      WHERE id = $15 AND user_id = $16
      RETURNING
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
        start_date,
        due_date,
        notes,
        status,
        created_at,
        updated_at
      `,
      [
        validated.type,
        validated.category ?? 'hutang_pribadi',
        validated.person_name,
        validated.total_amount,
        principal,
        validated.interest_rate ?? null,
        validated.interest_type ?? 'flat',
        validated.tenor_months ?? null,
        validated.monthly_installment ?? null,
        totalInterest,
        validated.start_date || null,
        validated.due_date || null,
        validated.notes || null,
        validated.initial_paid_amount !== undefined ? validated.initial_paid_amount : null,
        debtId,
        user.userId,
      ]
    );

    const updatedDebt = rows[0];

    // Sinkronisasi tagihan rutin terkait jika ini hutang payable dengan cicilan bulanan
    if (validated.type === 'payable' && validated.monthly_installment && validated.monthly_installment > 0) {
      try {
        const existingBill = await query('SELECT id FROM recurring_bills WHERE debt_id = $1 AND user_id = $2 LIMIT 1', [debtId, user.userId]);
        const dueDay = validated.schedule_due_day || (validated.start_date ? new Date(validated.start_date).getDate() : 10);
        
        if (existingBill.length > 0) {
          await query(
            `UPDATE recurring_bills
             SET title = $1, amount = $2, due_day = $3, wallet_id = COALESCE($4, wallet_id),
                 category_id = COALESCE($7, category_id)
             WHERE debt_id = $5 AND user_id = $6`,
            [
              `Cicilan: ${validated.person_name}`,
              validated.monthly_installment,
              dueDay,
              validated.wallet_id || null,
              debtId,
              user.userId,
              validated.budget_category_id || null,
            ]
          );
        } else {
          await query(
            `INSERT INTO recurring_bills (user_id, type, title, amount, category_id, due_day, wallet_id, debt_id, auto_record, is_active)
             VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7, TRUE, TRUE)`,
            [
              user.userId,
              `Cicilan: ${validated.person_name}`,
              validated.monthly_installment,
              validated.budget_category_id || null,
              dueDay,
              validated.wallet_id || null,
              debtId,
            ]
          );
        }
      } catch (err) {
        console.warn('[debts:put:sync-bill] gagal update jadwal cicilan', err);
      }
    }

    return NextResponse.json({ success: true, data: updatedDebt });
  } catch (error) {
    return handleRouteError(error, 'debts:put');
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const debtId = uuidIdParam.parse(id);

    // Hapus tagihan rutin terkait jika ada
    await query(`DELETE FROM recurring_bills WHERE debt_id = $1 AND user_id = $2`, [debtId, user.userId]);

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
