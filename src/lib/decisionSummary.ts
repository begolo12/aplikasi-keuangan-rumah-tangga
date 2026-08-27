import { formatRupiah } from './formatters';

export interface TopOverspentCategory {
  name: string;
  pct: number;
  overAmount: number;
}

export interface MonthlyDecisionInput {
  /** False bila bulan berjalan tanpa transaksi sama sekali (masih awal bulan). */
  hasAnyTransaction: boolean;
  netCashFlow: number;
  coldMoneyAmount: number;
  /** Kekurangan kas terhadap cadangan wajib + kewajiban, hanya relevan saat uang dingin nol. */
  coldMoneyGap: number;
  topOverspent: TopOverspentCategory | null;
}

export interface MonthlyDecision {
  statusTone: 'kosong' | 'surplus' | 'defisit' | 'seimbang';
  cashLine: string;
  budgetLine: string;
  fundLine: string;
  /** Maksimal satu saran aksi, prioritas tertinggi. */
  actionHint: string | null;
}

/**
 * Pembentuk putusan akhir bulan (rule-based, deterministik).
 * Tiga baris menjawab tiga pertanyaan keluarga: kas naik/turun, pos mana yang renteng,
 * dan apakah dana longgar aman dipakai.
 */
export function buildMonthlyDecision(input: MonthlyDecisionInput): MonthlyDecision {
  const { hasAnyTransaction, netCashFlow, coldMoneyAmount, coldMoneyGap, topOverspent } = input;

  if (!hasAnyTransaction) {
    return {
      statusTone: 'kosong',
      cashLine: 'Belum ada transaksi tercatat pada periode ini.',
      budgetLine: 'Anggaran dan realisasi belum dapat dibandingkan.',
      fundLine: 'Status dana longgar belum dapat dihitung dari data kosong.',
      actionHint: null,
    };
  }

  const surplus = netCashFlow > 0;
  const balanced = netCashFlow === 0;
  const statusTone: MonthlyDecision['statusTone'] = surplus ? 'surplus' : balanced ? 'seimbang' : 'defisit';

  const cashLine = balanced
    ? 'Bulan ini kas tidak bertambah dan tidak menyusut.'
    : surplus
    ? `Bulan ini kas naik ${formatRupiah(netCashFlow)}.`
    : `Bulan ini kas turun ${formatRupiah(Math.abs(netCashFlow))}.`;

  const budgetLine = topOverspent
    ? `Pos "${topOverspent.name}" lewat batas ${topOverspent.pct}% (lebih ${formatRupiah(topOverspent.overAmount)}).`
    : 'Semua pos belanja masih dalam batas anggaran.';

  const fundLine =
    coldMoneyAmount > 0
      ? `Uang dingin tersedia: ${formatRupiah(coldMoneyAmount)}.`
      : `Dana longgar belum siap; kurang ${formatRupiah(Math.max(0, coldMoneyGap))} dari cadangan wajib.`;

  let actionHint: string | null = null;
  if (topOverspent && !surplus) {
    actionHint = `Pangkas "${topOverspent.name}" sampai kembali masuk batas agar arus kas positif lagi.`;
  } else if (!surplus && !balanced) {
    actionHint = 'Tunda satu pengeluaran non-primer untuk menutup defisit bulan ini.';
  } else if (coldMoneyAmount > 0) {
    actionHint = `Uang dingin bebas dipakai atau disisihkan ke target tabungan tanpa menyinggung cadangan wajib.`;
  }

  return { statusTone, cashLine, budgetLine, fundLine, actionHint };
}
