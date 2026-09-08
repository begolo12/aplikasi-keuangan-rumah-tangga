import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { sendPushToUser } from '@/lib/push';
import { formatRupiah } from '@/lib/formatters';

/**
 * Cron harian Web Push (dipanggil Vercel Cron dengan Authorization: Bearer ${CRON_SECRET}).
 * Mengirim satu push per user berisi tagihan aktif yang jatuh tempo hari ini / besok
 * dan event keuangan yang sudah tiba.
 */

interface DueBill {
  user_id: string;
  id: string;
  title: string;
  amount: number;
  due_day: number;
}

interface DueEvent {
  user_id: string;
  id: string;
  title: string;
  type: string;
  date: string;
  amount: number | null;
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

function effectiveDueDay(dueDay: number, date: Date): number {
  // ponytail: due_day > jumlah hari bulan (mis. tgl 31 di Feb) di-clamp ke hari terakhir bulan.
  return Math.min(dueDay, daysInMonth(date.getFullYear(), date.getMonth() + 1));
}

function isDueOn(dueDay: number, target: Date): boolean {
  return effectiveDueDay(dueDay, target) === target.getDate();
}

function labelFor(target: Date, today: Date): string {
  return target.toDateString() === today.toDateString() ? 'Hari ini' : 'Besok';
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, error: 'CRON_SECRET belum dikonfigurasi.' }, { status: 503 });
    }
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const usersRes = await query<{ user_id: string }>('SELECT DISTINCT user_id FROM push_subscriptions');
    if (usersRes.length === 0) {
      return NextResponse.json({ success: true, data: { users: 0, sent: 0 } });
    }
    const userIds = usersRes.map((u) => u.user_id);

    // Tagihan aktif milik user ber-subscription yang belum tercatat pada periode hari ini / besok.
    const billsRes = await query<DueBill>(
      `SELECT b.user_id, b.id, b.title, b.amount::float8 AS amount, b.due_day
       FROM recurring_bills b
       WHERE b.user_id = ANY($1::uuid[]) AND b.is_active = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM bill_payments bp
           WHERE bp.bill_id = b.id AND bp.user_id = b.user_id
             AND (
               (bp.month = $2 AND bp.year = $3)
               OR (bp.month = $4 AND bp.year = $5)
             )
         )`,
      [
        userIds,
        today.getMonth() + 1,
        today.getFullYear(),
        tomorrow.getMonth() + 1,
        tomorrow.getFullYear(),
      ]
    );

    // Event keuangan yang jatuh tempo hari ini / besok
    const eventsRes = await query<DueEvent>(
      `SELECT e.user_id, e.id, e.title, e.type, e.amount::float8 AS amount, e.date
       FROM financial_events e
       WHERE e.user_id = ANY($1::uuid[]) AND e.is_active = TRUE
         AND (e.date = $6::date OR e.date = $7::date)`,
      [
        userIds,
        today.getMonth() + 1,
        today.getFullYear(),
        tomorrow.getMonth() + 1,
        tomorrow.getFullYear(),
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0],
      ]
    );

    // Kirim push untuk tagihan & event
    let sent = 0;
    for (const userId of userIds) {
      const dueBills = billsRes
        .filter((b) => b.user_id === userId)
        .filter((b) => isDueOn(b.due_day, today) || isDueOn(b.due_day, tomorrow))
        .sort((a, b) => a.due_day - b.due_day)
        .slice(0, 3);
      
      const dueEvents = eventsRes
        .filter((e) => e.user_id === userId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

      for (const b of dueBills) {
        const target = isDueOn(b.due_day, today) ? today : tomorrow;
        const result = await sendPushToUser(userId, {
          title: `Pengingat Tagihan: ${b.title}`,
          body: `${labelFor(target, today)} · ${formatRupiah(b.amount)}`,
          url: '/?action=tab-bills',
          tag: `kas-bill-${b.id}`,
        });
        sent += result.sent;
      }

      for (const e of dueEvents) {
        const eventDate = new Date(e.date);
        const result = await sendPushToUser(userId, {
          title: `Peringatan Acara Keuangan: ${e.title}`,
          body: `${eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • ${e.type.replace(/_/g, ' ').toUpperCase()}`,
          url: '/?action=tab-calendar',
          tag: `kas-event-${e.id}`,
        });
        sent += result.sent;
      }
    }

    return NextResponse.json({ success: true, data: { users: userIds.length, sent } });
  } catch (error) {
    return handleRouteError(error, 'push:cron');
  }
}
