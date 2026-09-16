import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { getJakartaDateParts } from '@/lib/formatters';
import { periodQuerySchema } from '@/lib/validations';
import { handleRouteError } from '@/lib/apiHelpers';
import { processPendingBills } from '@/lib/billAutoProcess';
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    // Periode default mengikuti kalender WIB pengguna, bukan kalender server UTC.
    const jakartaToday = getJakartaDateParts();
    const parsed = periodQuerySchema.parse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
    });
    const month = parsed.month ?? jakartaToday.month;
    const year = parsed.year ?? jakartaToday.year;

    const result = await withTransaction((client) => processPendingBills(client, session.userId, month, year));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error, 'bills:auto-process');
  }
}
