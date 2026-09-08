import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, readJsonBody, BusinessError } from '@/lib/apiHelpers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const subscribeSchema = z.object({
  endpoint: z.string().url('Endpoint push tidak valid').max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().max(1000),
});

/** Daftarkan / perbarui subscription push milik sesi aktif. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const rl = checkRateLimit(`push-sub:${getClientIp(req)}:${session.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new BusinessError(`Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.`, 429);
    }
    const validated = subscribeSchema.parse(await readJsonBody(req));

    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [session.userId, validated.endpoint, validated.keys.p256dh, validated.keys.auth]
    );

    return NextResponse.json({ success: true, message: 'Notifikasi push aktif.' });
  } catch (error) {
    return handleRouteError(error, 'push:subscribe');
  }
}

/** Hapus subscription milik sesi aktif (mis. saat user menonaktifkan notifikasi). */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const validated = unsubscribeSchema.parse(await readJsonBody(req));

    await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
      session.userId,
      validated.endpoint,
    ]);

    return NextResponse.json({ success: true, message: 'Notifikasi push dimatikan.' });
  } catch (error) {
    return handleRouteError(error, 'push:unsubscribe');
  }
}
