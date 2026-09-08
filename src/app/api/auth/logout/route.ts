import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Logout: cookie selalu dihapus. Pencabutan sesi JWT via kenaikan token_version
 * dilakukan best effort: kegagalan DB tidak boleh mencegah cookie terhapus.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (session) {
      try {
        await query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [session.userId]);
      } catch (error) {
        console.error('[api:auth:logout] gagal menaikkan token_version', error);
      }
    }
  } catch (error) {
    console.error('[api:auth:logout] gagal membaca sesi', error);
  }

  const res = NextResponse.json({ success: true, message: 'Berhasil keluar.' });
  clearSessionCookie(res);
  return res;
}
