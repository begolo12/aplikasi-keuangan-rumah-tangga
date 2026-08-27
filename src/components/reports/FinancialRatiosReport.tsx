'use client';

import React from 'react';
import {
  Scales,
  ShieldCheck,
  ShieldWarning,
  WarningOctagon,
  Sparkle,
  TrendUp,
  TrendDown,
  Receipt,
  Vault,
  Package,
  CheckCircle,
  WarningCircle,
  Lightbulb,
  FileCsv,
} from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { Wallet, Debt, Asset, Budget, MonthlySummary as MonthlySummaryType, FinancialRatiosResult } from '@/lib/types';

interface FinancialRatiosReportProps {
  summary: MonthlySummaryType | null;
  wallets: Wallet[];
  debts: Debt[];
  assets: Asset[];
  budgets: Budget[];
  selectedMonth: number;
  selectedYear: number;
  onExportCsv?: () => void;
}

export function calculateFinancialRatios(
  summary: MonthlySummaryType | null,
  wallets: Wallet[],
  debts: Debt[],
  assets: Asset[],
  budgets: Budget[]
): FinancialRatiosResult {
  const totalCash = wallets.reduce((sum, w) => sum + Math.max(0, w.balance || 0), 0);
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
  const totalLiabilities = totalPayables + pendingBills;

  // Total Harta & Net Worth
  const totalAssets = totalCash + totalReceivables + totalAssetValue;
  const netWorth = totalAssets - totalLiabilities;

  // Baseline Anggaran Bulanan
  const totalBudgetLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const baselineExpense = totalBudgetLimits > 0 ? totalBudgetLimits : monthlyExpense > 0 ? monthlyExpense : 1000000;

  // 1. DER (Debt to Equity Ratio %) = (Total Hutang / Kekayaan Bersih) * 100%
  const der_ratio = netWorth > 0 ? Math.round((totalLiabilities / netWorth) * 100) : totalLiabilities > 0 ? 999 : 0;

  // 2. DAR (Debt to Asset Ratio %) = (Total Hutang / Total Aset) * 100%
  const dar_ratio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;

  // 3. DSR / DTI (Debt Service Ratio %) = (Hutang Tertunda / Pemasukan Bulanan) * 100%
  const dsr_ratio = monthlyIncome > 0 ? Math.round((totalLiabilities / monthlyIncome) * 100) : totalLiabilities > 0 ? 100 : 0;

  // 4. Liquidity Ratio (Ketahanan Kas dalam Bulan) = Kas Likuid / Anggaran Bulanan
  const liquidity_months = Math.round((totalCash / baselineExpense) * 10) / 10;

  // 5. Savings Ratio % = (Arus Kas Bersih / Pemasukan) * 100%
  const savings_ratio = monthlyIncome > 0 ? Math.max(0, Math.round((netCashFlow / monthlyIncome) * 100)) : 0;

  // 6. Operating Expense Ratio % = (Pengeluaran / Pemasukan) * 100%
  const oer_ratio = monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 100) : 100;

  // Scoring Calculation (0 - 100)
  let score = 50;

  // DER Scoring (Bobot 20)
  if (der_ratio === 0) score += 20;
  else if (der_ratio <= 35) score += 15;
  else if (der_ratio <= 70) score += 5;
  else score -= 20;

  // DAR Scoring (Bobot 15)
  if (dar_ratio <= 20) score += 15;
  else if (dar_ratio <= 40) score += 8;
  else score -= 15;

  // Liquidity (Cadangan 4.4x Anggaran, Bobot 20)
  if (liquidity_months >= 4.4) score += 20;
  else if (liquidity_months >= 2) score += 10;
  else if (liquidity_months >= 1) score += 5;
  else score -= 20;

  // Savings Ratio (Bobot 20)
  if (savings_ratio >= 25) score += 20;
  else if (savings_ratio >= 15) score += 12;
  else if (savings_ratio >= 5) score += 5;
  else if (netCashFlow < 0) score -= 20;

  // DSR / DTI (Bobot 15)
  if (dsr_ratio === 0) score += 15;
  else if (dsr_ratio <= 20) score += 10;
  else if (dsr_ratio <= 35) score += 4;
  else score -= 15;

  // OER Efficiency (Bobot 10)
  if (oer_ratio <= 70) score += 10;
  else if (oer_ratio <= 85) score += 5;
  else score -= 10;

  const health_score = Math.max(10, Math.min(100, score));

  // Status Kondisi & Narasi Kesimpulan
  let condition_status: FinancialRatiosResult['condition_status'] = 'good';
  let condition_title = 'Kondisi Keuangan Cukup Sehat (Stabil)';
  let verdict_summary = '';

  if (health_score >= 80) {
    condition_status = 'excellent';
    condition_title = 'Kondisi Keuangan Sangat Sehat (Optimal)';
    verdict_summary = `Kondisi keuangan keluarga Anda berada di zona sangat prima (Skor ${health_score}/100). Rasio DER sangat rendah (${der_ratio}%), beban hutang minim (${dsr_ratio}%), dan ketahanan dana cadangan telah mencukupi kebutuhan ${liquidity_months} bulan. Keuangan Anda siap untuk ekspansi aset atau investasi jangka panjang.`;
  } else if (health_score >= 60) {
    condition_status = 'good';
    condition_title = 'Kondisi Keuangan Cukup Sehat (Stabil)';
    verdict_summary = `Struktur keuangan keluarga cukup stabil (Skor ${health_score}/100). Arus kas terkontrol dan rasio hutang masih dalam batas aman, namun tingkat cadangan dana likuid (${liquidity_months} bulan) masih perlu ditingkatkan menuju target ideal 4.4 bulan biaya hidup.`;
  } else if (health_score >= 40) {
    condition_status = 'warning';
    condition_title = 'Kondisi Keuangan Perlu Waspada';
    verdict_summary = `Terdapat beberapa pos keuangan yang memerlukan perhatian (Skor ${health_score}/100). Beban hutang (DER ${der_ratio}%) atau porsi pengeluaran (${oer_ratio}%) mulai menekan ruang tabungan. Disarankan membatasi penambahan hutang baru dan memangkas belanja non-primer.`;
  } else {
    condition_status = 'critical';
    condition_title = 'Kondisi Keuangan Kritis (Defisit / Risiko Tinggi)';
    verdict_summary = `Keuangan keluarga berada dalam situasi rentan (Skor ${health_score}/100). Rasio hutang melampaui batas aman atau arus kas mengalami defisit. Prioritaskan pelunasan hutang berbunga tinggi dan tunda segala pengeluaran tambahan.`;
  }

  // Ratio Details List
  const ratio_details = [
    {
      name: 'DER (Debt to Equity Ratio)',
      value: `${der_ratio}%`,
      ideal: '<= 35% (Maks 50%)',
      status: der_ratio <= 35 ? ('safe' as const) : der_ratio <= 75 ? ('warning' as const) : ('danger' as const),
      description: 'Perbandingan total hutang terhadap kekayaan bersih sendiri. Semakin kecil semakin mandiri.',
    },
    {
      name: 'DAR (Debt to Asset Ratio)',
      value: `${dar_ratio}%`,
      ideal: '<= 30%',
      status: dar_ratio <= 30 ? ('safe' as const) : dar_ratio <= 50 ? ('warning' as const) : ('danger' as const),
      description: 'Porsi aset yang dibiayai oleh hutang. Rasio rendah menjamin keamanan harta keluarga.',
    },
    {
      name: 'DSR / DTI (Debt Service Ratio)',
      value: `${dsr_ratio}%`,
      ideal: '<= 20% (Maks 30%)',
      status: dsr_ratio <= 20 ? ('safe' as const) : dsr_ratio <= 35 ? ('warning' as const) : ('danger' as const),
      description: 'Persentase pemasukan bulanan yang terserap untuk melunasi kewajiban.',
    },
    {
      name: 'Liquidity Ratio (Ketahanan Kas)',
      value: `${liquidity_months} Bulan`,
      ideal: '>= 4.4 Bulan Biaya',
      status: liquidity_months >= 4.4 ? ('safe' as const) : liquidity_months >= 2 ? ('warning' as const) : ('danger' as const),
      description: 'Kemampuan kas likuid menopang hidup jika pemasukan terhenti total.',
    },
    {
      name: 'Savings Ratio (Rasio Tabungan)',
      value: `${savings_ratio}%`,
      ideal: '>= 20% dari Pemasukan',
      status: savings_ratio >= 20 ? ('safe' as const) : savings_ratio >= 10 ? ('warning' as const) : ('danger' as const),
      description: 'Persentase uang masuk yang berhasil disisihkan dan menjadi surplus kekayaan.',
    },
    {
      name: 'OER (Operating Expense Ratio)',
      value: `${oer_ratio}%`,
      ideal: '<= 70% dari Pemasukan',
      status: oer_ratio <= 70 ? ('safe' as const) : oer_ratio <= 85 ? ('warning' as const) : ('danger' as const),
      description: 'Efisiensi belanja operasional hidup sehari-hari terhadap pendapatan.',
    },
  ];

  // Action Recommendations
  const action_recommendations: string[] = [];
  if (der_ratio > 50) {
    action_recommendations.push(`Fokus percepatan pelunasan pokok hutang (${formatRupiah(totalLiabilities)}) agar rasio DER kembali di bawah 35%.`);
  }
  if (liquidity_months < 4.4) {
    const gap = (baselineExpense * 4.4) - totalCash;
    action_recommendations.push(`Tingkatkan cadangan dana likuid sebesar ${formatRupiah(Math.max(0, gap))} untuk mencapai target 4.4 bulan biaya hidup.`);
  }
  if (savings_ratio < 20 && netCashFlow > 0) {
    action_recommendations.push('Tingkatkan rasio tabungan hingga minimal 20% dengan menghemat pos belanja fleksibel.');
  }
  if (netCashFlow < 0) {
    action_recommendations.push(`Arus kas bulan ini defisit ${formatRupiah(Math.abs(netCashFlow))}. Segera lakukan pengetatan anggaran belanja non-primer.`);
  }
  if (action_recommendations.length === 0) {
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

export function FinancialRatiosReport({
  summary,
  wallets,
  debts,
  assets,
  budgets,
  selectedMonth,
  selectedYear,
  onExportCsv,
}: FinancialRatiosReportProps) {
  const result = calculateFinancialRatios(summary, wallets, debts, assets, budgets);

  const getStatusBadge = (st: 'safe' | 'warning' | 'danger') => {
    switch (st) {
      case 'safe':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-income/10 text-income border border-income/20">Aman</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Waspada</span>;
      case 'danger':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-expense/10 text-expense border border-expense/20 animate-pulse">Berisiko</span>;
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
              <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums">{result.health_score}</span>
              <span className="text-xs font-semibold text-text-muted">/ 100</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  result.condition_status === 'excellent'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : result.condition_status === 'good'
                    ? 'bg-income/10 text-income border-income/20'
                    : result.condition_status === 'warning'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-expense/10 text-expense border-expense/20 animate-pulse'
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
              className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[32px]"
            >
              <FileCsv size={15} weight="bold" />
              <span>Ekspor Laporan</span>
            </button>
          )}
        </div>

        {/* Narrative Executive Summary */}
        <div className="p-3.5 bg-surface-2 rounded-2xl border border-border/60 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-text">
            <Sparkle size={16} weight="fill" className="text-primary shrink-0" />
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
              <span className="text-[10px] text-text-muted block mt-0.5">
                Target Ideal: <span className="font-semibold text-text">{ratio.ideal}</span>
              </span>
            </div>

            <p className="text-[10px] text-text-muted line-clamp-2 pt-1 border-t border-border/40">
              {ratio.description}
            </p>
          </div>
        ))}
      </div>

      {/* Actionable Recommendations Plan */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-text text-xs sm:text-sm">
          <Lightbulb size={18} weight="duotone" className="text-amber-500" />
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
    </div>
  );
}
