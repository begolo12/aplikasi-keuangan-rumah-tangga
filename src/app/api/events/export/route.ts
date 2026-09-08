import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleRouteError, BusinessError } from '@/lib/apiHelpers';
import ICAL from 'ical.js';

/**
 * GET /api/events/export
 * Export financial events to iCal (.ics) format for Google Calendar import
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.user?.id) {
      throw new BusinessError('Unauthorized', 401);
    }

    const userId = session.user.id;
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let queryText = `SELECT id, title, type, date, amount, description 
                     FROM financial_events 
                     WHERE user_id = $1 AND is_active = true`;
    let queryParams = [userId];

    if (startDate && endDate) {
      queryText += ` AND date >= $2 AND date <= $3`;
      queryParams.push(startDate, endDate);
    }

    queryText += ` ORDER BY date ASC, title ASC`;

    const result = await query(queryText, queryParams);
    const events = result.rows;

    const icsContent = generateIcsFile(events, userId);
    
    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="events-${new Date().toISOString().split('T')[0]}.ics"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
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
  const calendar = new ICAL.Component('vcalendar');
  calendar.addPropertyWithValue('version', '2.0');
  calendar.addPropertyWithValue('prodid', '-//KasKeluarga//Financial Events//ID');
  
  const vcalSub = calendar.getFirstSubcomponent();

  events.forEach(event => {
    const eventComp = new ICAL.Component('vevent');
    
    const uid = `${event.id}_${Date.now()}`;
    eventComp.addPropertyWithValue('uid', uid);
    
    const now = new Date();
    const dtstamp = ICAL.Time.fromJSDate(now, true);
    eventComp.addPropertyWithValue('dtstamp', dtstamp);
    
    const dtstart = parseDateStringForIcal(event.date);
    const dtstartProp = new ICAL.Property({
      name: 'dtstart',
      value: dtstart,
      parameters: { value: 'date' },
    });
    eventComp.addProperty(dtstartProp);
    
    eventComp.addPropertyWithValue('summary', escapeIcalText(event.title));
    
    const description = formatIcalDescription(event);
    eventComp.addPropertyWithValue('description', description);
    
    eventComp.addPropertyWithValue('status', 'CONFIRMED');
    
    vcalSub.addSubcomponent(eventComp);
  });

  return calendar.toString();
}

function parseDateStringForIcal(dateStr: string): ICAL.Time {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  return ICAL.Time.fromDateFields(year, month - 1, day);
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcalDescription(event: {
  amount: number | null;
  type: string;
  description: string | null;
}): string {
  const parts: string[] = [];
  
  if (event.amount !== null && event.amount !== undefined) {
    const formattedAmount = formatCurrency(event.amount);
    parts.push(`Jumlah: ${formattedAmount}`);
  }
  
  const typeLabel = getTypeLabel(event.type);
  parts.push(`Tipe: ${typeLabel}`);
  
  if (event.description) {
    parts.push(`Keterangan: ${event.description}`);
  }
  
  return parts.join('\n') || 'Tidak ada deskripsi';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bonus: 'Bonus/Pemasukan Tambahan',
    insurance_renewal: 'Perpanjangan Asuransi',
    tax_deadline: 'Batas Waktu Pajak',
    investment_contribution: 'Kontribusi Investasi',
  };
  return labels[type] || type;
}
