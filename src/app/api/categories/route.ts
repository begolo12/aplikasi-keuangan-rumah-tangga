import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { categorySchema } from '@/lib/validations';
import { handleRouteError, readJsonBody } from '@/lib/apiHelpers';
import { Category } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const categories = await query<Category>(
      `SELECT * FROM categories WHERE user_id = $1 ORDER BY type ASC, sort_order ASC, name ASC`,
      [session.userId]
    );

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return handleRouteError(error, 'categories:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = categorySchema.parse(await readJsonBody(req));

    const inserted = await query<Category>(
      `INSERT INTO categories (user_id, name, type, icon, color, is_default)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
      [session.userId, validated.name, validated.type, validated.icon, validated.color]
    );

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error) {
    return handleRouteError(error, 'categories:create');
  }
}
