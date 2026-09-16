'use client';

import React from 'react';
import {
  Gauge,
  CheckCircle,
  Lightbulb,
  FileCsv,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';
import { totalLiquidCash } from '@/lib/money';
import { Wallet, Debt, Asset, Budget, MonthlySummary as MonthlySummaryType, FinancialRatiosResult } from '@/lib/types';

interface FinancialRatiosReportProps {
  summary: MonthlySummaryType | null;
  wallets: Wallet[];
  debts: Debt[];
  assets: Asset[];
  budgets: Budget[];
  selectedMonth?: number;
  selectedYear?: number;
  onExportCsv?: () => void;
}

export function calculateFinancialRatios(
  summary: MonthlySummaryType | null,
  wallets: Wallet[],
  debts: Debt[],
  assets: Asset[],
  budgets: Budget[]
): FinancialRatiosResult {
  const totalCash = totalLiquidCash(wallets);
  const monthlyIncome = summary?.total_income || 0;
  const monthlyExpense = summary?.total_expense || 0;
  const netCashFlow = summary?.net_cash_flow || 0;

  // Assets Book Value
  const activeAssets = assets.filter((a) => !a.is_sold);
  const totalAssetValue = activeAssets.reduce(
    (sum, a) => sum + (a.current_value > 0 ? a.current_value : (a.book_value ?? a.purchase_price ?? 0)),
    0
  );

  // Debts & Receivables
  const totalPayables = debts
    .filter((d) => d.type === 'payable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const totalReceivables = debts
    .filter((d) => d.type === 'receivable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  const pendingBills = summary?.total_bills_pending_amount || 0;
  
  // Hitung cicilan bulanan untuk rasio beban cicilan (bukan total pokok hutang)
  const totalMonthlyInstallments = debts
    .filter((d) => d.type === 'payable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.monthly_installment || 0), 0);
  
  const totalLiabilities = totalPayables + pendingBills;

  // Total Harta & Net Worth
  const totalAssets = totalCash + totalReceivables + totalAssetValue;
  const netWorth = totalAssets - totalLiabilities;

  // Baseline biaya hidup bulanan. Anggaran lebih dulu, lalu realisasi nyata.
  // Tanpa keduanya, tidak ada dasar sama sekali — dan rasio tidak dihitung,
  // bukan dikira-kira dari angka tetap yang tidak diketahui pengguna.
  const totalBudgetLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const baselineExpense = totalBudgetLimits > 0 ? totalBudgetLimits : monthlyExpense > 0 ? monthlyExpense : 0;

  // 1. Hutang vs harta bersih (%) = (Total Hutang / Kekayaan Bersih) * 100%
  // null bila kekayaan bersih belum positif: pembagian itu tidak bermakna.
  const der_ratio = netWorth > 0 ? Math.round((totalLiabilities / netWorth) * 100) : null;

  // 2. Porsi harta dari hutang (%) = (Total Hutang / Total Aset) * 100%
  const dar_ratio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : null;

  // 3. Beban cicilan (%) = (Cicilan Bulanan / Pemasukan Bulanan) * 100%
  const dsr_ratio = monthlyIncome > 0
    ? Math.round(((totalMonthlyInstallments + pendingBills) / monthlyIncome) * 100)
    : null;

  // 4. Ketahanan kas (bulan) = Kas Likuid / Biaya Hidup Bulanan
  const liquidity_months = baselineExpense > 0
    ? Math.round((totalCash / baselineExpense) * 10) / 10
    : null;

  // 5. Rasio tabungan (%) = (Arus Kas Bersih / Pemasukan) * 100%
  const savings_ratio = monthlyIncome > 0
    ? Math.max(0, Math.round((netCashFlow / monthlyIncome) * 100))
    : null;

  // 6. Porsi belanja rutin (%) = (Pengeluaran / Pemasukan) * 100%
  const oer_ratio = monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 100) : null;

  // Scoring: hanya komponen yang bisa dihitung yang masuk hitungan.
  // Rasio `null` tidak dihitung sama sekali — bukan dianggap nol, karena nol berarti
  // "sempurna" di sebagian rasio dan "buruk" di rasio lain.
  const points: number[] = [];

  if (der_ratio !== null) points.push(der_ratio <= 35 ? 20 : der_ratio <= 70 ? 5 : -20);
  if (dar_ratio !== null) points.push(dar_ratio <= 20 ? 15 : dar_ratio <= 40 ? 8 : -15);
  if (liquidity_months !== null) {
    points.push(liquidity_months >= 4.4 ? 20 : liquidity_months >= 2 ? 10 : liquidity_months >= 1 ? 5 : -20);
  }
  if (savings_ratio !== null) {
    points.push(
      savings_ratio >= 25 ? 20 : savings_ratio >= 15 ? 12 : savings_ratio >= 5 ? 5 : netCashFlow < 0 ? -20 : 0
    );
  }
  if (dsr_ratio !== null) points.push(dsr_ratio <= 20 ? 15 : dsr_ratio <= 35 ? 4 : -15);
  if (oer_ratio !== null) points.push(oer_ratio <= 70 ? 10 : oer_ratio <= 85 ? 5 : -10);

  // Belum ada satu pun rasio yang bisa dinilai = belum ada yang bisa disimpulkan.
  const health_score = points.length === 0
    ? null
    : Math.round(Math.max(0, Math.min(100, 50 + points.reduce((sum, p) => sum + p, 0))));

  // Status Kondisi & Narasi Kesimpulan
  let condition_status: FinancialRatiosResult['condition_status'] = 'unknown';
  let condition_title = 'Belum Cukup Data untuk Dinilai';
  let verdict_summary =
    'Belum ada pemasukan, pengeluaran, anggaran, atau aset yang tercatat pada periode ini. Catat data keuangan terlebih dahulu agar rasio dan skor bisa dihitung.';

  if (health_score !== null) {
    if (health_score >= 80) {
      condition_status = 'excellent';
      condition_title = 'Kondisi Keuangan Sangat Sehat (Optimal)';
      verdict_summary = `Kondisi keuangan keluarga Anda berada di zona sangat prima (Skor ${health_score}/100). Rasio hutang vs harta ${formatRatio(der_ratio)}, beban cicilan ${formatRatio(dsr_ratio)}, dan ketahanan dana cadangan ${formatMonths(liquidity_months)}. Keuangan Anda siap untuk ekspansi aset atau investasi jangka panjang.`;
    } else if (health_score >= 60) {
      condition_status = 'good';
      condition_title = 'Kondisi Keuangan Cukup Sehat (Stabil)';
      verdict_summary = `Struktur keuangan keluarga cukup stabil (Skor ${health_score}/100). Arus kas terkontrol dan rasio hutang masih dalam batas aman, namun tingkat cadangan dana likuid ${formatMonths(liquidity_months)} masih perlu ditingkatkan menuju target ideal 4.4 bulan biaya hidup.`;
    } else if (health_score >= 40) {
      condition_status = 'warning';
      condition_title = 'Kondisi Keuangan Perlu Waspada';
      verdict_summary = `Terdapat beberapa pos keuangan yang memerlukan perhatian (Skor ${health_score}/100). Beban hutang (${formatRatio(der_ratio)}) atau porsi pengeluaran (${formatRatio(oer_ratio)}) mulai menekan ruang tabungan. Disarankan membatasi penambahan hutang baru dan memangkas belanja non-primer.`;
    } else {
      condition_status = 'critical';
      condition_title = 'Kondisi Keuangan Kritis (Defisit / Risiko Tinggi)';
      verdict_summary = `Keuangan keluarga berada dalam situasi rentan (Skor ${health_score}/100). Rasio hutang melampaui batas aman atau arus kas mengalami defisit. Prioritaskan pelunasan hutang berbunga tinggi dan tunda segala pengeluaran tambahan.`;
    }
  }

  // Ratio Details List
  const ratio_details: FinancialRatiosResult['ratio_details'] = [
    {
      name: 'Hutang vs Harta Bersih',
      value: formatRatio(der_ratio),
      ideal: '<= 35% (Maks 50%)',
      status: der_ratio === null ? 'unknown' : der_ratio <= 35 ? 'safe' : der_ratio <= 75 ? 'warning' : 'danger',
      description: 'Perbandingan total hutang terhadap kekayaan bersih sendiri. Semakin kecil semakin mandiri.',
    },
    {
      name: 'Porsi Harta dari Hutang',
      value: formatRatio(dar_ratio),
      ideal: '<= 30%',
      status: dar_ratio === null ? 'unknown' : dar_ratio <= 30 ? 'safe' : dar_ratio <= 50 ? 'warning' : 'danger',
      description: 'Porsi aset yang dibiayai oleh hutang. Rasio rendah menjamin keamanan harta keluarga.',
    },
    {
      name: 'Cicilan vs Pemasukan',
      value: formatRatio(dsr_ratio),
      ideal: '<= 20% (Maks 30%)',
      status: dsr_ratio === null ? 'unknown' : dsr_ratio <= 20 ? 'safe' : dsr_ratio <= 35 ? 'warning' : 'danger',
      description: 'Persentase pemasukan bulanan yang terserap untuk cicilan hutang.',
    },
    {
      name: 'Ketahanan Kas',
      value: formatMonths(liquidity_months),
      ideal: '>= 4.4 Bulan Biaya',
      status: liquidity_months === null ? 'unknown' : liquidity_months >= 4.4 ? 'safe' : liquidity_months >= 2 ? 'warning' : 'danger',
      description: 'Kemampuan kas likuid menopang hidup jika pemasukan terhenti total.',
    },
    {
      name: 'Rasio Tabungan',
      value: formatRatio(savings_ratio),
      ideal: '>= 20% dari Pemasukan',
      status: savings_ratio === null ? 'unknown' : savings_ratio >= 20 ? 'safe' : savings_ratio >= 10 ? 'warning' : 'danger',
      description: 'Persentase uang masuk yang berhasil disisihkan dan menjadi surplus kekayaan.',
    },
    {
      name: 'Porsi Belanja Rutin',
      value: formatRatio(oer_ratio),
      ideal: '<= 70% dari Pemasukan',
      status: oer_ratio === null ? 'unknown' : oer_ratio <= 70 ? 'safe' : oer_ratio <= 85 ? 'warning' : 'danger',
      description: 'Efisiensi belanja operasional hidup sehari-hari terhadap pendapatan.',
    },
  ];

  // Action Recommendations
  const action_recommendations: string[] = [];
  if (der_ratio !== null && der_ratio > 50) {
    action_recommendations.push(`Fokus percepatan pelunasan pokok hutang (${formatRupiah(totalLiabilities)}) agar rasio hutang kembali di bawah 35%.`);
  }
  if (liquidity_months !== null && liquidity_months < 4.4) {
    const gap = (baselineExpense * 4.4) - totalCash;
    action_recommendations.push(`Tingkatkan cadangan dana likuid sebesar ${formatRupiah(Math.max(0, gap))} untuk mencapai target 4.4 bulan biaya hidup.`);
  }
  if (savings_ratio !== null && savings_ratio < 20 && netCashFlow > 0) {
    action_recommendations.push('Tingkatkan rasio tabungan hingga minimal 20% dengan menghemat pos belanja fleksibel.');
  }
  if (netCashFlow < 0) {
    action_recommendations.push(`Arus kas bulan ini defisit ${formatRupiah(Math.abs(netCashFlow))}. Segera lakukan pengetatan anggaran belanja non-primer.`);
  }
  if (action_recommendations.length === 0 && health_score !== null) {
    action_recommendations.push('Seluruh rasio keuangan berada dalam kondisi prima. Pertahankan disiplin anggaran dan lanjutkan investasi produktif.');
  }

  return {
    der_ratio,
    dar_ratio,
    dsr_ratio,
    liquidity_months,
    savings_ratio,
    oer_ratio,
    health_score,
    condition_status,
    condition_title,
    verdict_summary,
    ratio_details,
    action_recommendations,
  };
}

/** Rasio `null` ditampilkan apa adanya, tidak diganti angka. */
function formatRatio(value: number | null): string {
  return value === null ? 'n/a' : `${value}%`;
}

function formatMonths(value: number | null): string {
  return value === null ? 'n/a' : `${value} Bulan`;
}

export function FinancialRatiosReport({
  summary,
  wallets,
  debts,
  assets,
  budgets,
  selectedMonth: _selectedMonth,
  selectedYear: _selectedYear,
  onExportCsv,
}: FinancialRatiosReportProps) {
  const result = calculateFinancialRatios(summary, wallets, debts, assets, budgets);

  const getStatusBadge = (st: 'safe' | 'warning' | 'danger' | 'unknown') => {
    switch (st) {
      case 'safe':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-income/10 text-income border border-income/20">Aman</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-warning/10 text-warning border border-warning/25">Waspada</span>;
      case 'danger':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-expense/10 text-expense border border-expense/20">Berisiko</span>;
      case 'unknown':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-surface-2 text-text-muted border border-border">Belum Dinilai</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero Score & Executive Verdict (Sangat mudah dibaca di HP) */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Skor Kesehatan Keuangan Holistik
            </span>
            <div className="flex items-baseline gap-3 pt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums">
                {result.health_score === null ? '—' : result.health_score}
              </span>
              {result.health_score !== null && <span className="text-xs font-semibold text-text-muted">/ 100</span>}
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  result.condition_status === 'excellent'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : result.condition_status === 'good'
                    ? 'bg-income/10 text-income border-income/20'
                    : result.condition_status === 'warning'
                    ? 'bg-warning/10 text-warning border-warning/25'
                    : result.condition_status === 'critical'
                    ? 'bg-expense/10 text-expense border-expense/20'
                    : 'bg-surface-2 text-text-muted border-border'
                }`}
              >
                {result.condition_title}
              </span>
            </div>
          </div>

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[44px]"
            >
              <FileCsv size={15} weight="bold" />
              <span>Ekspor Laporan</span>
            </button>
          )}
        </div>

        {/* Narrative Executive Summary */}
        <div className="p-3.5 bg-surface-2 rounded-2xl border border-border/60 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-text">
            <Gauge size={16} weight="fill" className="text-primary shrink-0" />
            <span>Kesimpulan Kondisi Keuangan Anda:</span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            {result.verdict_summary}
          </p>
        </div>
      </div>

      {/* 6 Key Financial Ratios Grid (Glanceable di HP, Detail di PC) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {result.ratio_details.map((ratio, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-surface border border-border rounded-2xl sm:rounded-3xl flex flex-col justify-between gap-2 shadow-2xs hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[11px] font-bold text-text-muted line-clamp-1">{ratio.name}</span>
              {getStatusBadge(ratio.status)}
            </div>

            <div>
              <p className="text-base sm:text-xl font-extrabold text-text tabular-nums">
                {ratio.value}
              </p>
              <span className="text-[11px] text-text-muted block mt-0.5">
                Target Ideal: <span className="font-semibold text-text">{ratio.ideal}</span>
              </span>
            </div>

            <p className="text-[11px] text-text-muted line-clamp-2 pt-1 border-t border-border/40">
              {ratio.description}
            </p>
          </div>
        ))}
      </div>

      {/* Actionable Recommendations Plan */}
      {result.action_recommendations.length > 0 && (
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-text text-xs sm:text-sm">
          <Lightbulb size={18} weight="duotone" className="text-warning" />
          <span>Rekomendasi Langkah Tindakan Finansial</span>
        </div>

        <div className="space-y-2 text-xs">
          {result.action_recommendations.map((actionText, idx) => (
            <div
              key={idx}
              className="p-3 bg-surface-2 rounded-2xl border border-border/60 flex items-start gap-2 text-text leading-relaxed"
            >
              <CheckCircle size={16} weight="fill" className="text-primary shrink-0 mt-0.5" />
              <span className="text-[11px]">{actionText}</span>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
