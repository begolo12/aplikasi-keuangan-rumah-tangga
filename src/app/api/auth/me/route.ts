import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const users = await query<{
      id: string;
      name: string;
      email: string;
      family_name: string;
      avatar_url: string | null;
      created_at: string;
    }>('SELECT id, name, email, family_name, avatar_url, created_at FROM users WHERE id = $1', [session.userId]);

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: users[0] });
  } catch (error: any) {
    console.error('Auth me error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
