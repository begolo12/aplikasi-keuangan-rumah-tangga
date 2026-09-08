import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import { BudgetTemplate } from '@/lib/types';

/**
 * GET /api/budgets/templates - Retrieve user's budget templates
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const templates = await query<BudgetTemplate[]>(
      `SELECT id, user_id, name, description, rule_type, is_default, allocations, created_at, updated_at
       FROM budgets_templates
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [session.userId]
    );

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    return handleRouteError(error, 'budgets-templates:list');
  }
}

/**
 * POST /api/budgets/templates - Create custom budget template
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, description, rule_type, allocations } = body;

    if (!name || !rule_type || !allocations || !Array.isArray(allocations)) {
      throw new BusinessError('Nama, rule_type, dan allocations wajib diisi', 400);
    }

    if (rule_type !== '50_30_20' && rule_type !== 'zero_based' && rule_type !== 'custom') {
      throw new BusinessError('rule_type harus 50_30_20, zero_based, atau custom', 400);
    }

    const result = await query(
      `INSERT INTO budgets_templates (user_id, name, description, rule_type, allocations)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [session.userId, name, description || null, rule_type, JSON.stringify(allocations)]
    );

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return handleRouteError(error, 'budgets-templates:create');
  }
}

/**
 * DELETE /api/budgets/templates - Delete a budget template by query param id
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

    await query(
      `DELETE FROM budgets_templates WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    );

    return NextResponse.json({ success: true, message: 'Template dihapus' });
  } catch (error) {
    return handleRouteError(error, 'budgets-templates:delete');
  }
}
