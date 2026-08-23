import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

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
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      WHERE t.user_id = $1
    `;

    const params: any[] = [session.userId];
    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3`;
      params.push(parseInt(month, 10), parseInt(year, 10));
    } else if (year) {
      sql += ` AND EXTRACT(YEAR FROM t.date) = $2`;
      params.push(parseInt(year, 10));
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC`;

    const rows = await query<any>(sql, params);

    // Build CSV Header
    const csvHeaders = ['Tanggal', 'Tipe', 'Dompet Asal', 'Dompet Tujuan', 'Kategori', 'Nominal', 'Biaya Admin', 'Catatan'];
    
    // Map rows
    const csvRows = rows.map((r) => {
      const d = new Date(r.date);
      const day = String(d.getDate()).padStart(2, '0');
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      const dateFormatted = `${day}/${m}/${y}`;

      const typeLabel = r.type === 'expense' ? 'Pengeluaran' : r.type === 'income' ? 'Pemasukan' : 'Transfer';
      const escape = (str: string | null | undefined) => `"${(str || '').replace(/"/g, '""')}"`;

      return [
        dateFormatted,
        typeLabel,
        escape(r.wallet_name),
        escape(r.to_wallet_name),
        escape(r.category_name),
        parseFloat(r.amount),
        parseFloat(r.admin_fee || 0),
        escape(r.description),
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');
    const filename = `Laporan-Keuangan-${year || 'Semua'}${month ? `-${month}` : ''}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
