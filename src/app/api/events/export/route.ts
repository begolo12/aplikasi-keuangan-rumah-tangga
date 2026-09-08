import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';

/**
 * GET /api/events/export
 * Export financial events to iCal (.ics) format for Google Calendar / Apple Calendar import
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session?.userId) {
      throw new BusinessError('Unauthorized', 401);
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let queryText = `SELECT id, title, type, date, amount, description 
                     FROM financial_events 
                     WHERE user_id = $1 AND is_active = true`;
    const queryParams: (string | number)[] = [session.userId];

    if (startDate && endDate) {
      queryText += ` AND date >= $2 AND date <= $3`;
      queryParams.push(startDate, endDate);
    }

    queryText += ` ORDER BY date ASC, title ASC`;

    const events = await query<{
      id: string;
      title: string;
      type: string;
      date: string;
      amount: number | null;
      description: string | null;
    }>(queryText, queryParams);

    const icsContent = generateIcsFile(events);
    
    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="events-${new Date().toISOString().split('T')[0]}.ics"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'events:export');
  }
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateIcsFile(
  events: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
    amount: number | null;
    description: string | null;
  }>
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KasKeluarga//Financial Events//ID',
    'CALSCALE:GREGORIAN',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const event of events) {
    const cleanDate = event.date.replace(/-/g, '');
    const descParts: string[] = [];
    if (event.type) descParts.push(`Tipe: ${event.type}`);
    if (event.amount) descParts.push(`Nominal: Rp ${event.amount.toLocaleString('id-ID')}`);
    if (event.description) descParts.push(event.description);

    lines.push(
      'BEGIN:VEVENT',
      `UID:kaskeluarga-event-${event.id}@kaskeluarga.local`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${cleanDate}`,
      `SUMMARY:${escapeIcalText(event.title)}`,
      `DESCRIPTION:${escapeIcalText(descParts.join(' | '))}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}
