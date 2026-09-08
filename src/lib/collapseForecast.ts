import { getLocalDateString } from './formatters';
/**
 * Forecasting colapse: jika pendapatan tiba-tiba 0, berapa lama kas bertahan.
 * Pure, teruji via audit-self-test.
 */
export type CollapseLevel = 'aman' | 'waspada' | 'kritis' | 'colapse';

export interface CollapseForecast {
  /** Kas total saat ini (hanya kas likuid, bukan aset) */
  totalCash: number;
  /** Burn rate bulanan (pengeluaran + tagihan rutin) */
  burnRate: number;
  /** Sisa bulan hingga kas habis (Infinity jika burn 0) */
  monthsUntilCollapse: number;
  /** Sisa hari (months*30) */
  daysUntilCollapse: number;
  /** Tanggal colapse (ISO YYYY-MM-DD) atau null jika Infinity */
  collapseDate: string | null;
  /** Level ketahanan */
  level: CollapseLevel;
}

/**
 * Hitung forecasting colapse.
 * @param totalCash - total kas riil (boleh 0 atau minus)
 * @param monthlyBurn - burn rate bulanan (>0 ideal, fallback 1jt jika 0 agar tidak Infinity menyesatkan? Tapi pure: jika 0 → Infinity)
 */
export function calculateCollapseForecast(totalCash: number, monthlyBurn: number): CollapseForecast {
  const cash = Number.isFinite(totalCash) ? totalCash : 0;
  const burn = Number.isFinite(monthlyBurn) ? monthlyBurn : 0;

  let monthsUntilCollapse: number;
  let daysUntilCollapse: number;
  let collapseDate: string | null = null;
  let level: CollapseLevel;

  if (burn <= 0) {
    monthsUntilCollapse = Infinity;
    daysUntilCollapse = Infinity;
    level = 'aman';
  } else if (cash <= 0) {
    monthsUntilCollapse = 0;
    daysUntilCollapse = 0;
    level = 'colapse';
    const d = new Date();
    d.setDate(d.getDate() + daysUntilCollapse);
    collapseDate = getLocalDateString(d);
  } else {
    monthsUntilCollapse = cash / burn;
    daysUntilCollapse = monthsUntilCollapse * 30;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(daysUntilCollapse));
    collapseDate = getLocalDateString(d);

    if (monthsUntilCollapse >= 6) level = 'aman';
    else if (monthsUntilCollapse >= 3) level = 'waspada';
    else if (monthsUntilCollapse >= 1) level = 'kritis';
    else level = 'colapse';
  }

  return {
    totalCash: cash,
    burnRate: burn,
    monthsUntilCollapse,
    daysUntilCollapse,
    collapseDate,
    level,
  };
}
