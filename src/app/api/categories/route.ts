import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { categorySchema } from '@/lib/validations';
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
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = categorySchema.parse(body);

    const inserted = await query<Category>(
      `INSERT INTO categories (user_id, name, type, icon, color, is_default)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
      [session.userId, validated.name, validated.type, validated.icon, validated.color]
    );

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Create category error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
