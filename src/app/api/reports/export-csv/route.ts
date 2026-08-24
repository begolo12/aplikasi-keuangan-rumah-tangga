import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const parsed = periodQuerySchema.parse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const month = parsed.month;
    const year = parsed.year;

    // Join metadata diikat pemiliknya; ekspor hanya memuat baris milik user ini.
    let sql = `
      SELECT
        t.date,
        t.type,
        t.amount,
        t.admin_fee,
        c.name as category_name,
        w.name as wallet_name,
        tw.name as to_wallet_name,
        t.description
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
      LEFT JOIN wallets w ON t.wallet_id = w.id AND w.user_id = t.user_id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id AND tw.user_id = t.user_id
      WHERE t.user_id = $1
    `;

    const params: unknown[] = [session.userId];
    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3`;
      params.push(month, year);
    } else if (year) {
      sql += ` AND EXTRACT(YEAR FROM t.date) = $2`;
      params.push(year);
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC`;

    interface CsvRow {
      date: string;
      type: string;
      amount: string;
      admin_fee: string | null;
      category_name: string | null;
      wallet_name: string | null;
      to_wallet_name: string | null;
      description: string | null;
    }
    const rows = await query<CsvRow>(sql, params);

    const csvHeaders = ['Tanggal', 'Tipe', 'Dompet Asal', 'Dompet Tujuan', 'Kategori', 'Nominal', 'Biaya Admin', 'Catatan'];

    const csvRows = rows.map((r) => {
      const d = new Date(r.date);
      const day = String(d.getDate()).padStart(2, '0');
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      const dateFormatted = `${day}/${m}/${y}`;

      const typeLabel = r.type === 'expense' ? 'Pengeluaran' : r.type === 'income' ? 'Pemasukan' : 'Transfer';
      const escape = (str: string | null | undefined) => `"${(str || '').replace(/"/g, '""')}"`;
      const numeric = (value: string | null) => parseFloat(value || '0').toFixed(2);

      return [
        dateFormatted,
        typeLabel,
        escape(r.wallet_name),
        escape(r.to_wallet_name),
        escape(r.category_name),
        numeric(r.amount),
        numeric(r.admin_fee),
        escape(r.description),
      ].join(',');
    });

    const csvContent = ['\ufeff' + csvHeaders.join(','), ...csvRows].join('\r\n');
    const safeMonth = month ? String(month).padStart(2, '0') : '';
    const filename = `Laporan-Keuangan-${year || 'Semua'}${safeMonth ? `-${safeMonth}` : ''}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'reports:export-csv');
  }
}
