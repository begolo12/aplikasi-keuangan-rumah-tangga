import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { Subscription } from '@/lib/types';
import { z } from 'zod';

const subscriptionSchema = z.object({
  provider_name: z.string().min(1, 'Nama layanan wajib diisi').max(150),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  cycle: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  next_charge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().optional().nullable(),
  wallet_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  reminder_enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    
    // Get all active subscriptions or filter by cycle
    const cycle = searchParams.get('cycle') || undefined;
    
    const subs = await query<Record<string, unknown>>(
      `SELECT 
        s.id, s.user_id, s.provider_name, s.amount, s.cycle, s.next_charge_date,
        s.category_id, c.name as category_name,
        s.wallet_id, w.name as wallet_name,
        s.is_active, s.reminder_enabled, s.created_at, s.updated_at
      FROM subscriptions s
      LEFT JOIN categories c ON s.category_id = c.id AND c.user_id = s.user_id
      LEFT JOIN wallets w ON s.wallet_id = w.id AND w.user_id = s.user_id
      WHERE s.user_id = $1 ${cycle ? 'AND s.cycle = $2' : ''}
      ORDER BY s.next_charge_date ASC`,
      [session.userId, ...(cycle ? [cycle] : [])]
    );

    interface SubLike {
      is_active: boolean;
      reminder_enabled: boolean;
    }

    const formatted: Subscription[] = (subs as unknown as SubLike[]).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      provider_name: s.provider_name,
      amount: parseFloat(s.amount as string),
      cycle: s.cycle as Subscription['cycle'],
      next_charge_date: s.next_charge_date,
      category_id: s.category_id,
      category_name: s.category_name,
      wallet_id: s.wallet_id,
      wallet_name: s.wallet_name,
      is_active: s.is_active,
      reminder_enabled: s.reminder_enabled,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = subscriptionSchema.parse(await readJsonBody(req));
    
    const result = await withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO subscriptions (
          user_id, provider_name, amount, cycle, next_charge_date,
          category_id, wallet_id, is_active, reminder_enabled, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          session.userId,
          validated.provider_name,
          validated.amount,
          validated.cycle,
          validated.next_charge_date,
          validated.category_id,
          validated.wallet_id,
          validated.is_active,
          validated.reminder_enabled,
        ]
      );

      return res.rows[0];
    });

    const newSub: Subscription = {
      id: result.id,
      user_id: result.user_id,
      provider_name: result.provider_name,
      amount: parseFloat(result.amount as string),
      cycle: result.cycle as Subscription['cycle'],
      next_charge_date: result.next_charge_date,
      category_id: result.category_id,
      category_name: null,
      wallet_id: result.wallet_id,
      wallet_name: null,
      is_active: result.is_active,
      reminder_enabled: result.reminder_enabled,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };

    return NextResponse.json({ success: true, data: newSub });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:create');
  }
}
