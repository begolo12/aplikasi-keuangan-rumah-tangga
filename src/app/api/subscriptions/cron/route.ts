import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { sendPushToUser } from '@/lib/push';
import { formatRupiah } from '@/lib/formatters';

/**
 * GET /api/subscriptions/cron
 * Cron job endpoint to process subscription reminders (H-7 and H-1)
 * Triggered by Vercel Cron or external service worker
 */
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, error: 'CRON_SECRET belum dikonfigurasi.' }, { status: 503 });
    }
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Idempotensi harian: tandai pengiriman push per tanggal agar cron 2x tidak dobel kirim.
    const logTable = await query(
      `CREATE TABLE IF NOT EXISTS push_send_log (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL,
         kind TEXT NOT NULL,
         sent_date DATE NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         UNIQUE (user_id, kind, sent_date)
       )`
    );
    void logTable;

    // Fetch all active subscriptions with reminders enabled
    const subs = await query<any>(
      `SELECT
        s.id, s.user_id, s.provider_name, s.amount, s.cycle, s.next_charge_date,
        s.reminder_enabled, c.name as category_name, w.name as wallet_name
      FROM subscriptions s
      LEFT JOIN categories c ON s.category_id = c.id AND c.user_id = s.user_id
      LEFT JOIN wallets w ON s.wallet_id = w.id AND w.user_id = s.user_id
      WHERE s.is_active = TRUE
        AND s.reminder_enabled = TRUE
      ORDER BY s.next_charge_date ASC`
    );

    const remindersByUser = new Map<string, Array<{ title: string; daysUntilDue: number; amount: number }>>();
    let processedCount = 0;
    let sentCount = 0;

    // Group by user_id and calculate reminders
    for (const sub of subs) {
      if (!sub.reminder_enabled || !sub.user_id) continue;

      const chargeDate = new Date(sub.next_charge_date);
      const diffTime = chargeDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Only send reminder if within H-7 or H-1 window
      if (diffDays > 7 || diffDays < 0) continue;

      const key = `${sub.user_id}`;
      let list = remindersByUser.get(key);
      if (!list) {
        list = [];
        remindersByUser.set(key, list);
      }

      list.push({
        title: sub.provider_name || 'Langganan',
        daysUntilDue: diffDays,
        amount: parseFloat(sub.amount),
      });

      processedCount++;
    }

    // Kirim satu push gabungan per user per hari.
    for (const [userId, list] of remindersByUser) {
      try {
        const alreadySent = await query<{ id: string }>(
          'SELECT id FROM push_send_log WHERE user_id = $1 AND kind = $2 AND sent_date = $3',
          [userId, 'subscription_reminder', todayStr]
        );
        if (alreadySent.length > 0) continue;

        const lines = list
          .map((r) => `${r.title}: ${formatRupiah(r.amount)} (H-${r.daysUntilDue})`)
          .join(', ');
        await sendPushToUser(userId, {
          title: 'Pengingat Langganan',
          body: `Jatuh tempo mendatang: ${lines}`,
          url: '/?action=tab-calendar',
        });
        await query('INSERT INTO push_send_log (user_id, kind, sent_date) VALUES ($1, $2, $3)', [
          userId,
          'subscription_reminder',
          todayStr,
        ]);
        sentCount++;
      } catch {
        // Gagal push satu user tidak menghentikan pengiriman user lain.
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: processedCount,
        users_notified: sentCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:cron');
  }
}
