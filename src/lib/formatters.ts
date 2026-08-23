/**
 * Formats a number to Indonesian Rupiah currency string.
 * Example: 1500000 -> "Rp 1.500.000"
 */
export function formatRupiah(amount: number | string | null | undefined, withSymbol: boolean = true): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return withSymbol ? 'Rp 0' : '0';
  
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);

  return withSymbol ? `Rp ${formatted}` : formatted;
}

/**
 * Compact Rupiah format for charts and small labels.
 * Example: 1500000 -> "1,5 jt", 25000 -> "25 rb"
 */
export function formatCompactRupiah(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} jt`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} rb`;
  }
  return amount.toString();
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
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

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
 * Get current year and month helper.
 */
export function getCurrentPeriod(): { month: number; year: number; monthName: string } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return {
    month,
    year,
    monthName: INDONESIAN_MONTHS[month - 1],
  };
}
