import { type CurrencyType } from './types';

/**
 * Formats a number to Indonesian Rupiah currency string.
 * Example: 1500000 -> "Rp 1.500.000"
 */
/**
 * Format ISO date string to Indonesian format (DD MMM YYYY)
 */
export function formatDateISO(isoString: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatRupiah(amount: number | string | null | undefined, withSymbol: boolean = true): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return withSymbol ? 'Rp\u00A00' : '0';
  
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);

  return withSymbol ? `Rp\u00A0${formatted}` : formatted;
}

/**
 * Compact Rupiah format for charts and small labels.
 * Example: 1500000 -> "1,5 jt", 25000 -> "25 rb"
 */
export function formatCompactRupiah(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const oneDecimal = (value: number): string => {
    const fixed = value.toFixed(1);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed.replace('.', ',');
  };
  if (abs >= 1_000_000_000) return `${sign}${oneDecimal(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}${oneDecimal(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} rb`;
  return `${sign}${abs}`;
}

/**
 * Formats an ISO date string to Indonesian localized format.
 * Example: "2026-08-23" -> "23 Agu 2026" or "Minggu, 23 Agustus 2026"
 */
export function formatDate(dateStr: string, mode: 'short' | 'long' | 'relative' = 'short'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  if (mode === 'relative') {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (dateStr === todayStr) return 'Hari Ini';
    if (dateStr === yesterdayStr) return 'Kemarin';
  }

  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthsLong = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  if (mode === 'long') {
    const dayName = days[date.getDay()];
    return `${dayName}, ${day} ${monthsLong[month]} ${year}`;
  }

  return `${day} ${monthsShort[month]} ${year}`;
}

/**
 * Returns month names in Indonesian.
 */
export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Umur verifikasi rekonsiliasi dompet.
 * 'fresh' <= 14 hari, 'stale' > 14 hari, 'never' belum pernah direkonsiliasi.
 */
export type ReconcileAge = 'fresh' | 'stale' | 'never';
/**
 * Format local date YYYY-MM-DD untuk modal defaults, input date, dan UI display.
 * Alternative: new Date().toISOString().split('T')[0] tapi timezone-dependent.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getReconcileAge(reconciledAt: string | null | undefined, now: Date = new Date()): ReconcileAge {
  if (!reconciledAt) return 'never';
  const then = new Date(reconciledAt);
  if (isNaN(then.getTime())) return 'never';
  const days = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  return days > 14 ? 'stale' : 'fresh';
}

/**
 * Formats currency amount with symbol and locale based on currency code.
 * Supports IDR, USD, EUR, and CNY currencies.
 */
export function formatCurrency(amount: number | string | null | undefined, currency: CurrencyType = 'IDR', withSymbol: boolean = true): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return withSymbol ? formatCurrencySymbol(currency) : '0';

  const symbols: Record<CurrencyType, string> = {
    IDR: 'Rp',
    USD: '$',
    EUR: '€',
    CNY: '¥',
  };

  const localeMappings: Record<CurrencyType, string> = {
    IDR: 'id-ID',
    USD: 'en-US',
    EUR: 'de-DE',
    CNY: 'zh-CN',
  };

  const formatted = new Intl.NumberFormat(localeMappings[currency], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  const prefix = symbols[currency];
  const result = withSymbol ? `${prefix} ${formatted}` : formatted;

  // Negatif: wrap dalam kurung jika ada simbol
  return num < 0 ? `(${result})` : result;
}

/**
 * Get currency symbol for a given currency type.
 */
export function formatCurrencySymbol(currency: CurrencyType): string {
  const symbols: Record<CurrencyType, string> = {
    IDR: 'Rp',
    USD: '$',
    EUR: '€',
    CNY: '¥',
  };
  return symbols[currency];
}
