import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { sendPushToUser } from '@/lib/push';
import {
  formatRupiah,
  getJakartaDateParts,
  getJakartaDateString,
  addDaysToDateString,
} from '@/lib/formatters';

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

/**
 * Apakah `dueDay` jatuh pada `dateStr` (YYYY-MM-DD)?
 * `dueDay` di atas jumlah hari bulan berjalan (mis. tgl 31 di Februari) di-clamp
 * ke hari terakhir bulan itu. Perbandingan memakai string tanggal kalender WIB,
 * bukan `Date` lokal server, agar tidak meleset saat server berjalan di UTC.
 */
function isDueOn(dueDay: number, dateStr: string): boolean {
  const [year, month] = dateStr.split('-').map(Number);
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(dueDay, lastDayOfMonth) === Number(dateStr.slice(8, 10));
}

/** Tanggal (YYYY-MM-DD) ditampilkan sebagai tanggal Indonesia, bukan tanggal server. */
function formatDateId(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  });
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

    // Kalender pengguna (WIB), bukan kalender server (UTC). Lihat getJakartaDateParts.
    const todayStr = getJakartaDateString();
    const tomorrowStr = addDaysToDateString(todayStr, 1);
    const todayParts = getJakartaDateParts();

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
        todayParts.month,
        todayParts.year,
        Number(tomorrowStr.slice(5, 7)),
        Number(tomorrowStr.slice(0, 4)),
      ]
    );

    // Event keuangan yang jatuh tempo hari ini / besok
    const eventsRes = await query<DueEvent>(
      `SELECT e.user_id, e.id, e.title, e.type, e.amount::float8 AS amount, e.date
       FROM financial_events e
       WHERE e.user_id = ANY($1::uuid[]) AND e.is_active = TRUE
         AND (e.date = $2::date OR e.date = $3::date)`,
      [userIds, todayStr, tomorrowStr]
    );

    // Hutang belum lunas yang jatuh tempo hari ini / besok / sudah lewat,
    // kecuali yang sudah punya tagihan cicilan aktif (biar tidak dobel ingatkan).
    const debtsRes = await query<{ user_id: string; id: string; person_name: string; remaining: number; due_date: string }>(
      `SELECT d.user_id, d.id, d.person_name, (d.total_amount - d.paid_amount)::float8 AS remaining, d.due_date::text AS due_date
       FROM debts d
       WHERE d.user_id = ANY($1::uuid[]) AND d.status != 'paid' AND d.due_date IS NOT NULL
         AND d.due_date <= $2::date
         AND NOT EXISTS (
           SELECT 1 FROM recurring_bills b
           WHERE b.debt_id = d.id AND b.user_id = d.user_id AND b.is_active = TRUE
         )
       ORDER BY d.due_date ASC LIMIT 100`,
      [userIds, tomorrowStr]
    );

    // Kirim push untuk tagihan & event
    let sent = 0;
    for (const userId of userIds) {
      const dueBills = billsRes
        .filter((b) => b.user_id === userId)
        .filter((b) => isDueOn(b.due_day, todayStr) || isDueOn(b.due_day, tomorrowStr))
        .sort((a, b) => a.due_day - b.due_day)
        .slice(0, 3);
      
      const dueEvents = eventsRes
        .filter((e) => e.user_id === userId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

      for (const b of dueBills) {
        const dueToday = isDueOn(b.due_day, todayStr);
        const result = await sendPushToUser(userId, {
          title: `Pengingat Tagihan: ${b.title}`,
          body: `${dueToday ? 'Hari ini' : 'Besok'} · ${formatRupiah(b.amount)}`,
          url: '/?action=tab-bills',
          tag: `kas-bill-${b.id}`,
        });
        sent += result.sent;
      }

      for (const e of dueEvents) {
        const result = await sendPushToUser(userId, {
          title: `Peringatan Acara Keuangan: ${e.title}`,
          body: `${formatDateId(e.date)} • ${e.type.replace(/_/g, ' ').toUpperCase()}`,
          url: '/?action=tab-calendar',
          tag: `kas-event-${e.id}`,
        });
        sent += result.sent;
      }

      const dueDebts = debtsRes
        .filter((d) => d.user_id === userId)
        .slice(0, 3);
      for (const d of dueDebts) {
        const result = await sendPushToUser(userId, {
          title: `Hutang jatuh tempo: ${d.person_name}`,
          body: `Sisa ${formatRupiah(d.remaining)} · jatuh tempo ${formatDateId(d.due_date)}`,
          url: '/?action=tab-debts',
          tag: `kas-debt-${d.id}`,
        });
        sent += result.sent;
      }
    }

    return NextResponse.json({ success: true, data: { users: userIds.length, sent } });
  } catch (error) {
    return handleRouteError(error, 'push:cron');
  }
}

// Vercel Cron memanggil endpoint dengan GET, bukan POST.
export async function GET(req: NextRequest) {
  return POST(req);
}
