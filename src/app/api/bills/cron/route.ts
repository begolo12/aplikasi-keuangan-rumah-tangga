import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { processPendingBills } from '@/lib/billAutoProcess';

/**
 * Cron harian auto-record tagihan (dipanggil Vercel Cron dengan
 * Authorization: Bearer ${CRON_SECRET}).
 * Menjalankan tagihan auto_record yang sudah jatuh tempo hari ini
 * untuk semua user, masing-masing dalam transaksi sendiri.
 */
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
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const users = await query<{ user_id: string }>(
      'SELECT DISTINCT user_id FROM recurring_bills WHERE is_active = TRUE AND auto_record = TRUE'
    );

    let processed = 0;
    for (const u of users) {
      const result = await withTransaction((client) =>
        processPendingBills(client, u.user_id, month, year, { autoRecordOnly: true, dueThrough: todayStr })
      );
      processed += result.processed_count;
    }

    return NextResponse.json({ success: true, data: { users: users.length, processed } });
  } catch (error) {
    return handleRouteError(error, 'bills:cron');
  }
}
