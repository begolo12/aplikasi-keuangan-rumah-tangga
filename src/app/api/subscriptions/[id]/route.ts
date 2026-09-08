import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const sub = await query<any>(
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

    if (sub.length === 0) {
      throw new BusinessError('Subscription tidak ditemukan', 404);
    }

    const result = sub[0];

    return NextResponse.json({
      success: true,
      data: {
        id: String(result.id),
        user_id: String(result.user_id),
        provider_name: String(result.provider_name),
        amount: parseFloat(String(result.amount)),
        cycle: result.cycle as 'daily' | 'weekly' | 'monthly' | 'yearly',
        next_charge_date: String(result.next_charge_date),
        category_id: result.category_id ? String(result.category_id) : null,
        category_name: result.category_name ? String(result.category_name) : null,
        wallet_id: result.wallet_id ? String(result.wallet_id) : null,
        wallet_name: result.wallet_name ? String(result.wallet_name) : null,
        is_active: Boolean(result.is_active),
        reminder_enabled: Boolean(result.reminder_enabled),
        created_at: String(result.created_at),
        updated_at: String(result.updated_at),
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
    const body = (await readJsonBody(req)) as Record<string, any>;

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
      throw new BusinessError('Format tanggal YYYY-MM-DD invalid', 400);
    }
    if (body.category_id !== undefined && body.category_id !== null && typeof body.category_id !== 'string') {
      throw new BusinessError('category_id invalid', 400);
    }
    if (body.wallet_id !== undefined && body.wallet_id !== null && typeof body.wallet_id !== 'string') {
      throw new BusinessError('wallet_id invalid', 400);
    }

    const updated = await withTransaction(async (client) => {
      // Check exists
      const existing = await client.query(
        'SELECT id FROM subscriptions WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, session.userId]
      );

      if (existing.rows.length === 0) {
        throw new BusinessError('Subscription tidak ditemukan', 404);
      }

      // Dynamic build query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (body.provider_name !== undefined) {
        updates.push(`provider_name = $${paramIdx++}`);
        values.push(body.provider_name.trim());
      }
      if (body.amount !== undefined) {
        updates.push(`amount = $${paramIdx++}`);
        values.push(body.amount);
      }
      if (body.cycle !== undefined) {
        updates.push(`cycle = $${paramIdx++}`);
        values.push(body.cycle);
      }
      if (body.next_charge_date !== undefined) {
        updates.push(`next_charge_date = $${paramIdx++}`);
        values.push(body.next_charge_date);
      }
      if (body.category_id !== undefined) {
        updates.push(`category_id = $${paramIdx++}`);
        values.push(body.category_id);
      }
      if (body.wallet_id !== undefined) {
        updates.push(`wallet_id = $${paramIdx++}`);
        values.push(body.wallet_id);
      }
      if (body.is_active !== undefined) {
        updates.push(`is_active = $${paramIdx++}`);
        values.push(Boolean(body.is_active));
      }
      if (body.reminder_enabled !== undefined) {
        updates.push(`reminder_enabled = $${paramIdx++}`);
        values.push(Boolean(body.reminder_enabled));
      }

      if (updates.length === 0) {
        throw new BusinessError('Tidak ada field yang diupdate', 400);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, session.userId);

      const updateQuery = `
        UPDATE subscriptions 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIdx++} AND user_id = $${paramIdx} 
        RETURNING *
      `;

      const res = await client.query(updateQuery, values);
      return res.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        user_id: updated.user_id,
        provider_name: updated.provider_name,
        amount: parseFloat(updated.amount),
        cycle: updated.cycle,
        next_charge_date: updated.next_charge_date,
        category_id: updated.category_id,
        wallet_id: updated.wallet_id,
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

    if (result.length === 0) {
      throw new BusinessError('Subscription tidak ditemukan atau tidak terautorisasi', 404);
    }

    return NextResponse.json({ success: true, message: 'Subscription berhasil dihapus' });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:delete');
  }
}
