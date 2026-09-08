import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { readJsonBody } from '@/lib/apiHelpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    const sub = await query<Record<string, unknown>>(
      `SELECT 
        s.id, s.user_id, s.provider_name, s.amount, s.cycle, s.next_charge_date,
        s.category_id, c.name as category_name,
        s.wallet_id, w.name as wallet_name,
        s.is_active, s.reminder_enabled, s.created_at, s.updated_at
      FROM subscriptions s
      LEFT JOIN categories c ON s.category_id = c.id AND c.user_id = s.user_id
      LEFT JOIN wallets w ON s.wallet_id = w.id AND w.user_id = s.user_id
      WHERE s.id = $1 AND s.user_id = $2`,
      [id, session.userId]
    );

    if (sub.rows.length === 0) {
      throw new BusinessError('Subscription tidak ditemukan', 404);
    }

    interface SubLike {
      is_active: boolean;
      reminder_enabled: boolean;
    }

    const result = (sub.rows[0] as unknown) as SubLike;

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        user_id: result.user_id,
        provider_name: result.provider_name,
        amount: parseFloat(result.amount as string),
        cycle: result.cycle as 'daily' | 'weekly' | 'monthly' | 'yearly',
        next_charge_date: result.next_charge_date,
        category_id: result.category_id,
        category_name: result.category_name,
        wallet_id: result.wallet_id,
        wallet_name: result.wallet_name,
        is_active: result.is_active,
        reminder_enabled: result.reminder_enabled,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:get');
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await readJsonBody(req);

    // Validate input
    if (body.provider_name !== undefined && (!body.provider_name || body.provider_name.length > 150)) {
      throw new BusinessError('Nama layanan invalid', 400);
    }
    if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
      throw new BusinessError('Nominal harus lebih dari 0', 400);
    }
    if (body.cycle !== undefined && !['daily', 'weekly', 'monthly', 'yearly'].includes(body.cycle)) {
      throw new BusinessError('Cycle harus daily/weekly/monthly/yearly', 400);
    }
    if (body.next_charge_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.next_charge_date)) {
      throw new BusinessError('Format tanggal invalid', 400);
    }
    if (body.category_id !== undefined && body.category_id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.category_id)) {
      throw new BusinessError('Category ID format invalid', 400);
    }
    if (body.wallet_id !== undefined && body.wallet_id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.wallet_id)) {
      throw new BusinessError('Wallet ID format invalid', 400);
    }

    const updated = await withTransaction(async (client) => {
      const res = await client.query(
        `UPDATE subscriptions SET
          provider_name = COALESCE($1, provider_name),
          amount = COALESCE($2, amount),
          cycle = COALESCE($3, cycle),
          next_charge_date = COALESCE($4, next_charge_date),
          category_id = COALESCE($5, category_id),
          wallet_id = COALESCE($6, wallet_id),
          is_active = COALESCE($7, is_active),
          reminder_enabled = COALESCE($8, reminder_enabled),
          updated_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING *`,
        [
          body.provider_name ?? null,
          body.amount !== undefined ? body.amount : null,
          body.cycle ?? null,
          body.next_charge_date ?? null,
          body.category_id ?? null,
          body.wallet_id ?? null,
          body.is_active !== undefined ? body.is_active : null,
          body.reminder_enabled !== undefined ? body.reminder_enabled : null,
          id,
          session.userId,
        ]
      );

      if (res.rowCount === 0) {
        throw new BusinessError('Subscription tidak ditemukan atau tidak terautorisasi', 404);
      }

      return res.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        user_id: updated.user_id,
        provider_name: updated.provider_name,
        amount: parseFloat(updated.amount as string),
        cycle: updated.cycle as 'daily' | 'weekly' | 'monthly' | 'yearly',
        next_charge_date: updated.next_charge_date,
        category_id: updated.category_id,
        category_name: null,
        wallet_id: updated.wallet_id,
        wallet_name: null,
        is_active: updated.is_active,
        reminder_enabled: updated.reminder_enabled,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:update');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const result = await query(
      `DELETE FROM subscriptions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, session.userId]
    );

    if (result.rows.length === 0) {
      throw new BusinessError('Subscription tidak ditemukan atau tidak terautorisasi', 404);
    }

    return NextResponse.json({ success: true, message: 'Subscription berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:delete');
  }
}
