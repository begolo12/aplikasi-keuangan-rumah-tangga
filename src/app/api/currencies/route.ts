import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { CurrencyRate, CurrencyType } from '@/lib/types';

const SUPPORTED_CURRENCIES: Record<CurrencyType, boolean> = {
  IDR: true,
  USD: true,
  EUR: true,
  CNY: true,
};

// Base rates relative to USD. Nilai statis ini hanya cadangan, bukan kurs terkini.
const BASE_RATES: Record<string, number> = {
  USD: 1,
  IDR: 15745.50,
  EUR: 0.92,
  CNY: 7.24,
};

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const base = (searchParams.get('base') as CurrencyType | null) || 'IDR';

    if (!SUPPORTED_CURRENCIES[base]) {
      return NextResponse.json(
        { success: false, error: 'Mata uang tidak didukung. Gunakan IDR, USD, EUR, atau CNY.' },
        { status: 400 }
      );
    }

    const { rates, source } = await fetchLatestRates();

    // Convert to base currency
    const convertedRates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(rates)) {
      if (SUPPORTED_CURRENCIES[currency as keyof typeof SUPPORTED_CURRENCIES]) {
        convertedRates[currency] = rate / rates[base];
      }
    }

    const response: CurrencyRate = {
      base,
      timestamp: Date.now(),
      rates: convertedRates,
      source,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('[Currencies] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data kurs mata uang' },
      { status: 500 }
    );
  }
}

/**
 * Ambil kurs terkini. `source` menentukan cara UI menyajikan angkanya:
 * 'live' boleh disebut kurs, 'fallback' harus disebut perkiraan.
 */
async function fetchLatestRates(): Promise<{ rates: Record<string, number>; source: 'live' | 'fallback' }> {
  try {
    const response = await fetch('https://api.exchangerate.host/latest?base=USD', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      // Penyedia bisa membalas HTTP 200 dengan success:false (mis. kunci tidak ada).
      // Tanpa cek ini, cadangan statis akan dikirim sambil mengaku sebagai kurs live.
      if (data?.success !== false && data.rates && typeof data.rates === 'object' && data.rates.IDR) {
        return { rates: data.rates as Record<string, number>, source: 'live' };
      }
      console.warn('[Currencies] Penyedia mengembalikan respons tanpa rates yang sah:', data?.success);
    }
  } catch (err) {
    console.warn('[Currencies] Penyedia kurs gagal dihubungi, memakai tabel statis:', err);
  }

  return { rates: BASE_RATES, source: 'fallback' };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { base, target } = body;

    if (!base || !target) {
      return NextResponse.json(
        { success: false, error: 'Parameter base dan target diperlukan' },
        { status: 400 }
      );
    }

    if (!(base in SUPPORTED_CURRENCIES) || !(target in SUPPORTED_CURRENCIES)) {
      return NextResponse.json(
        { success: false, error: 'Mata uang tidak didukung' },
        { status: 400 }
      );
    }

    const { rates, source } = await fetchLatestRates();
    const conversionRate = rates[target] / rates[base];

    return NextResponse.json({
      success: true,
      data: {
        base,
        target,
        rate: conversionRate,
        timestamp: Date.now(),
        source,
      },
    });
  } catch (error) {
    console.error('[Currencies] Conversion error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghitung konversi' },
      { status: 500 }
    );
  }
}
