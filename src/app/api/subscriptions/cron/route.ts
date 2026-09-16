import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { sendPushToUser } from '@/lib/push';
import { formatRupiah, getJakartaDateString } from '@/lib/formatters';

/**
 * GET /api/subscriptions/cron
 * Cron harian langganan: (1) auto-debit langganan jatuh tempo yg opt-in
 * (potong saldo + catat transaksi + majukan next_charge_date), (2) push
 * pengingat H-7 s.d. H-0 untuk yg tidak auto-debit / belum jatuh tempo.
 */
function advanceDate(dateStr: string, cycle: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (cycle === 'daily') d.setDate(d.getDate() + 1);
  else if (cycle === 'weekly') d.setDate(d.getDate() + 7);
  else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

    const todayStr = getJakartaDateString();

    await query(
      `CREATE TABLE IF NOT EXISTS push_send_log (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL,
         kind TEXT NOT NULL,
         sent_date DATE NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         UNIQUE (user_id, kind, sent_date)
       )`
    );

    const subs = await query<{
      id: string; user_id: string; provider_name: string; amount: string;
      cycle: string; next_charge_date: string; category_id: string | null;
      wallet_id: string | null; auto_debit: boolean; reminder_enabled: boolean;
    }>(
      `SELECT s.id, s.user_id, s.provider_name, s.amount, s.cycle,
        s.next_charge_date::text AS next_charge_date,
        s.category_id, s.wallet_id,
        COALESCE(s.auto_debit, FALSE) AS auto_debit, s.reminder_enabled
       FROM subscriptions s
       WHERE s.is_active = TRUE
       ORDER BY s.next_charge_date ASC`
    );

    const remindersByUser = new Map<string, Array<{ title: string; daysUntilDue: number; amount: number }>>();
    let debitedCount = 0;
    let processedCount = 0;
    let sentCount = 0;

    for (const sub of subs) {
      if (!sub.user_id) continue;
      const chargeDate = new Date((sub.next_charge_date || '').slice(0, 10) + 'T00:00:00');
      if (isNaN(chargeDate.getTime())) continue;
      // Selisih hari dihitung dari tanggal kalender WIB (bukan selisih jam server UTC),
      // supaya "jatuh tempo hari ini" tetap benar antara 00:00-06:59 WIB.
      const diffDays = Math.round(
        (Date.parse(`${sub.next_charge_date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${todayStr}T00:00:00Z`)) /
          (1000 * 60 * 60 * 24)
      );
      const amount = parseFloat(sub.amount);

      // Auto-debit: jatuh tempo hari ini / sudah lewat, opt-in, dan ada dompet.
      if (diffDays <= 0 && sub.auto_debit && sub.wallet_id) {
        try {
          await withTransaction(async (client) => {
            const locked = await client.query(
              `SELECT id, next_charge_date::text AS next_charge_date FROM subscriptions
               WHERE id = $1 AND user_id = $2 AND is_active = TRUE FOR UPDATE`,
              [sub.id, sub.user_id]
            );
            if (locked.rows.length === 0) return;
            const current = String(locked.rows[0].next_charge_date).slice(0, 10);
            if (current > todayStr) return; // sudah dimajukan sesi lain
            const wallet = await client.query(
              'SELECT id FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
              [sub.wallet_id, sub.user_id]
            );
            if (wallet.rows.length === 0) return;
            await client.query(
              'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
              [amount, sub.wallet_id, sub.user_id]
            );
            await client.query(
              `INSERT INTO transactions (user_id, type, amount, category_id, wallet_id, description, date)
               VALUES ($1, 'expense', $2, $3, $4, $5, $6)`,
              [sub.user_id, amount, sub.category_id, sub.wallet_id, `Langganan otomatis: ${sub.provider_name || 'Langganan'}`, todayStr]
            );
            await client.query(
              'UPDATE subscriptions SET next_charge_date = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
              [advanceDate(current, sub.cycle), sub.id, sub.user_id]
            );
          });
          debitedCount++;
          continue; // sudah dibayar otomatis, tidak perlu diingatkan
        } catch {
          // gagal debit satu langganan tidak menghentikan yg lain; masukkan ke pengingat
        }
      }

      if (!sub.reminder_enabled) continue;
      if (diffDays > 7 || diffDays < 0) continue;
      const key = `${sub.user_id}`;
      let list = remindersByUser.get(key);
      if (!list) {
        list = [];
        remindersByUser.set(key, list);
      }
      list.push({ title: sub.provider_name || 'Langganan', daysUntilDue: diffDays, amount });
      processedCount++;
    }

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
        debited: debitedCount,
        users_notified: sentCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'subscriptions:cron');
  }
}

// Vercel Cron memanggil endpoint dengan GET; samakan POST ke GET.
export async function POST(req: NextRequest) {
  return GET(req);
}
