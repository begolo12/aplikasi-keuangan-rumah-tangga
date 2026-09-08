import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';

/**
 * DELETE /api/budgets/templates/:id - Delete a budget template by id
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
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
