import webpush from 'web-push';
import { query } from './db';
import { BusinessError } from './apiHelpers';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || publicKey.includes('your_') || privateKey.includes('your_')) {
    throw new BusinessError('Web Push belum dikonfigurasi di server (VAPID keys).', 503);
  }
  webpush.setVapidDetails('mailto:support@kaskeluarga.app', publicKey, privateKey);
  configured = true;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushSendResult {
  sent: number;
  removed: number;
}

/**
 * Kirim push ke semua subscription milik satu user.
 * Subscription stale (404/410 dari push service) dihapus agar tabel bersih.
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<PushSendResult> {
  ensureConfigured();

  const subs = await query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  let sent = 0;
  let removed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(message)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        removed++;
      }
      // Error lain (mis. 429 rate limit): biarkan subscription tetap ada.
    }
  }

  return { sent, removed };
}
