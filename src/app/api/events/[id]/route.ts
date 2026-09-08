import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.user?.id) {
      throw new BusinessError('Unauthorized', 401);
    }

    const { id } = await params;
    
    const result = await query(
      `SELECT * FROM financial_events WHERE id = $1 AND user_id = $2`,
      [id, session.user.id]
    );

    if (result.rows.length === 0) {
      throw new BusinessError('Event not found', 404);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.user?.id) {
      throw new BusinessError('Unauthorized', 401);
    }

    const { id } = await params;
    const body = await req.json();
    const { title, type, date, amount, description, recurrence_rule, notification_days_before, is_active } = body;

    if (!title || title.trim().length === 0) {
      throw new BusinessError('Title is required', 400);
    }
    if (!type || !['bonus', 'insurance_renewal', 'tax_deadline', 'investment_contribution'].includes(type)) {
      throw new BusinessError('Invalid event type', 400);
    }
    if (!date) {
      throw new BusinessError('Date is required', 400);
    }

    const existing = await query(
      `SELECT * FROM financial_events WHERE id = $1 AND user_id = $2`,
      [id, session.user.id]
    );

    if (existing.rows.length === 0) {
      throw new BusinessError('Event not found', 404);
    }

    const result = await query(
      `UPDATE financial_events 
       SET title = $1, type = $2, date = $3, amount = $4, description = $5, 
           recurrence_rule = $6, notification_days_before = $7, is_active = $8,
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        title,
        type,
        date,
        amount || null,
        description || null,
        recurrence_rule || null,
        notification_days_before ?? 1,
        is_active !== undefined ? is_active : true,
        id,
        session.user.id,
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.user?.id) {
      throw new BusinessError('Unauthorized', 401);
    }

    const { id } = await params;
    
    const existing = await query(
      `SELECT * FROM financial_events WHERE id = $1 AND user_id = $2`,
      [id, session.user.id]
    );

    if (existing.rows.length === 0) {
      throw new BusinessError('Event not found', 404);
    }

    await query(
      `DELETE FROM financial_events WHERE id = $1 AND user_id = $2`,
      [id, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
