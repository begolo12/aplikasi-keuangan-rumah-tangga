import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session?.userId) {
      throw new BusinessError('Unauthorized', 401);
    }

    const events = await query(
      `SELECT 
        id, user_id, title, type, date, amount, description, 
        recurrence_rule, notification_days_before, is_active, 
        created_at, updated_at
       FROM financial_events 
       WHERE user_id = $1 
       ORDER BY date DESC, created_at DESC`,
      [session.userId]
    );

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    return handleRouteError(error, 'events:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session?.userId) {
      throw new BusinessError('Unauthorized', 401);
    }

    const body = await req.json();
    const { title, type, date, amount, description, recurrence_rule, notification_days_before } = body;

    if (!title || title.trim().length === 0) {
      throw new BusinessError('Title is required', 400);
    }
    if (!type || !['bonus', 'insurance_renewal', 'tax_deadline', 'investment_contribution'].includes(type)) {
      throw new BusinessError('Invalid event type', 400);
    }
    if (!date) {
      throw new BusinessError('Date is required', 400);
    }

    const result = await query(
      `INSERT INTO financial_events (user_id, title, type, date, amount, description, recurrence_rule, notification_days_before)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        session.userId,
        title,
        type,
        date,
        amount || null,
        description || null,
        recurrence_rule || null,
        notification_days_before ?? 1,
      ]
    );

    return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'events:create');
  }
}
