'use client';

import React, { useState, useEffect } from 'react';
import { MonthlySummary as MonthlySummaryType, Debt, Asset } from '@/lib/types';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import {
  Heartbeat,
  ShieldCheck,
  TrendUp,
  Warning,
  CheckCircle,
  Lightbulb,
  Scales,
  Vault,
  Receipt,
  Package,
} from '@phosphor-icons/react';

interface EvaluationViewProps {
  summary: MonthlySummaryType | null;
  currentMonth: number;
  currentYear: number;
  debts?: Debt[];
}

interface PrevSummary {
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
}

export function EvaluationView({
  summary,
  currentMonth,
  currentYear,
  debts = [],
}: EvaluationViewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [prev, setPrev] = useState<PrevSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch<{ assets: Asset[] }>(endpoints.assets)
      .then((res) => {
        if (isMounted) setAssets(res.assets || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingAssets(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const pm = currentMonth === 1 ? 12 : currentMonth - 1;
    const py = currentMonth === 1 ? currentYear - 1 : currentYear;
    apiFetch<MonthlySummaryType>(endpoints.reportsMonthly(pm, py))
      .then((res) => {
        if (isMounted)
          setPrev({
            total_income: res.total_income || 0,
            total_expense: res.total_expense || 0,
            net_cash_flow: res.net_cash_flow || 0,
          });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [currentMonth, currentYear]);

  if (!summary || isLoadingAssets) {
    return <DashboardSkeleton />;
  }

  // Delta vs bulan sebelumnya: null = tidak ada data pembanding
  const pctChange = (now: number, before: number | undefined): number | null =>
    prev && before !== undefined && before !== 0 ? Math.round(((now - before) / Math.abs(before)) * 100) : null;

  // 1. Data calculations
  const totalCash = summary.total_balance || 0;
  const monthlyIncome = summary.total_income || 0;
  const monthlyExpense = summary.total_expense || 0;
  const netCashFlow = summary.net_cash_flow || 0;

  const incomeDelta = pctChange(monthlyIncome, prev?.total_income);
  const expenseDelta = pctChange(monthlyExpense, prev?.total_expense);
  const flowDelta = pctChange(netCashFlow, prev?.net_cash_flow);

  // Assets
  const totalAssetBookValue = assets.reduce((sum, a) => sum + (a.book_value ?? a.purchase_price ?? 0), 0);
  const totalMonthlyDepreciation = assets.reduce((sum, a) => sum + (a.monthly_depreciation ?? 0), 0);

  // Debts
  const totalPayableRemaining = debts
    .filter((d) => d.type === 'payable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const totalReceivableRemaining = debts
    .filter((d) => d.type === 'receivable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  // Net Worth = Total Cash + Assets Book Value + Receivables - Payables
  const netWorth = totalCash + totalAssetBookValue + totalReceivableRemaining - totalPayableRemaining;

  // Emergency Fund Ratio (Months of average expense covered)
  const expenseBenchmark = monthlyExpense > 0 ? monthlyExpense : 1000000;
  const emergencyFundMonths = Math.round((totalCash / expenseBenchmark) * 10) / 10;

  // Savings Rate %
  const savingsRate = monthlyIncome > 0
    ? Math.max(0, Math.round((netCashFlow / monthlyIncome) * 100))
    : 0;

  // Debt to Income Ratio (DTI %)
  const dtiRatio = monthlyIncome > 0
    ? Math.round((totalPayableRemaining / monthlyIncome) * 100)
    : totalPayableRemaining > 0 ? 100 : 0;

  // Financial Health Scoring (0 - 100)
  let score = 50; // base score

  // Cashflow surplus factor (+20 or -20)
  if (monthlyIncome > 0) {
    if (netCashFlow > 0) score += 20;
    else if (netCashFlow < 0) score -= 20;
  } else if (monthlyExpense === 0) {
    score += 10;
  }

  // Emergency fund factor (+15 if >= 3 months, +10 if >= 1 month, -10 if 0)
  if (emergencyFundMonths >= 3) score += 15;
  else if (emergencyFundMonths >= 1) score += 8;
  else if (totalCash <= 0) score -= 15;

  // Savings rate factor (+10 if >= 20%)
  if (savingsRate >= 20) score += 10;
  else if (savingsRate >= 10) score += 5;

  // Debt burden factor
  if (dtiRatio === 0) score += 10;
  else if (dtiRatio <= 30) score += 5;
  else if (dtiRatio > 50) score -= 15;

  // Budget adherence
  if (summary.budget_over_count === 0) score += 5;
  else score -= 10;

  score = Math.max(10, Math.min(100, score));

  // Rating and color
  let scoreTitle = 'Kondisi Cukup Sehat (Stabil)';
  let scoreBadgeColor = 'bg-income/10 text-income border-income/20';
  let scoreBarColor = 'bg-income';

  if (score >= 80) {
    scoreTitle = 'Kondisi Sangat Sehat (Optimal)';
    scoreBadgeColor = 'bg-primary/10 text-primary border-primary/20';
    scoreBarColor = 'bg-primary';
  } else if (score < 60) {
    scoreTitle = 'Perlu Evaluasi & Penyesuaian';
    scoreBadgeColor = 'bg-expense/10 text-expense border-expense/20';
    scoreBarColor = 'bg-expense';
  }

  // Actionable Insights
  const insights: { type: 'success' | 'warning' | 'info'; title: string; desc: string }[] = [];

  if (netCashFlow < 0) {
    insights.push({
      type: 'warning',
      title: 'Arus Kas Mengalami Defisit',
      desc: `Pengeluaran bulan ${INDONESIAN_MONTHS[currentMonth - 1]} melebihi pemasukan sebesar ${formatRupiah(Math.abs(netCashFlow))}. Pertimbangkan memangkas pos belanja non-primer.`,
    });
  } else if (savingsRate >= 20) {
    insights.push({
      type: 'success',
      title: 'Rasio Tabungan Sangat Baik',
      desc: `Anda berhasil menyisihkan ${savingsRate}% dari pemasukan bulan ini (${formatRupiah(netCashFlow)}). Alokasikan ke dana darurat atau aset investasi.`,
    });
  }

  if (emergencyFundMonths < 3) {
    insights.push({
      type: 'warning',
      title: 'Dana Darurat Masih di Bawah Target Ideal',
      desc: `Cadangan kas Anda saat ini dapat menopang kebutuhan sekitar ${emergencyFundMonths} bulan. Target ideal keuangan keluarga adalah minimal 3 hingga 6 bulan pengeluaran.`,
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Ketahanan Dana Darurat Kokoh',
      desc: `Cadangan kas Anda mampu menutupi kebutuhan hidup selama ${emergencyFundMonths} bulan jika terjadi situasi tak terduga.`,
    });
  }

  if (dtiRatio > 40) {
    insights.push({
      type: 'warning',
      title: 'Beban Hutang Cukup Tinggi',
      desc: `Total sisa hutang aktif mencapai ${dtiRatio}% dari pemasukan bulanan. Prioritaskan pelunasan hutang dengan bunga tertinggi terlebih dahulu.`,
    });
  }

  if (totalAssetBookValue > 0) {
    insights.push({
      type: 'info',
      title: 'Portofolio Aset & Depresiasi Terpantau',
      desc: `Total nilai buku aset Anda adalah ${formatRupiah(totalAssetBookValue)} dengan estimasi beban penyusutan ${formatRupiah(totalMonthlyDepreciation)}/bulan.`,
    });
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-text flex items-center gap-2">
            <Heartbeat size={22} className="text-primary" weight="duotone" />
            <span>Evaluasi & Kesehatan Finansial</span>
          </h2>
          <p className="text-xs text-text-muted">
            Analisis kondisi arus kas, rasio ketahanan dana darurat, beban hutang, dan kekayaan bersih periode {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}.
          </p>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Skor Kesehatan Keuangan (Financial Health Score)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums">{score}</span>
              <span className="text-xs font-semibold text-text-muted">/ 100</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${scoreBadgeColor}`}>
                {scoreTitle}
              </span>
            </div>
          </div>

          {/* Net Worth Summary Strip */}
          <div className="p-3 bg-surface-2 border border-border/70 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scales size={22} weight="duotone" />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block font-semibold">Estimasi Kekayaan Bersih (Net Worth)</span>
              <span className="text-sm sm:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
                {formatRupiah(netWorth)}
              </span>
            </div>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-border/40">
            <div
              className={`h-full ${scoreBarColor} rounded-full transition-all duration-700`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>0 (Kritis)</span>
            <span>50 (Cukup)</span>
            <span>80+ (Sangat Sehat)</span>
            <span>100 (Optimal)</span>
          </div>
        </div>

        {/* Tren vs bulan sebelumnya */}
        {prev && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: 'Pemasukan', delta: incomeDelta },
              { label: 'Pengeluaran', delta: expenseDelta },
              { label: 'Arus Kas', delta: flowDelta },
            ].map(({ label, delta }) =>
              delta === null ? (
                <span
                  key={label}
                  className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border/60 text-[10px] font-semibold text-text-muted"
                >
                  {label}: —
                </span>
              ) : (
                <span
                  key={label}
                  title={`Bulan lalu: ${delta >= 0 ? '+' : ''}${delta}%`}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold tabular-nums ${
                    delta >= 0 ? 'bg-income/10 text-income border-income/20' : 'bg-expense/10 text-expense border-expense/20'
                  }`}
                >
                  {delta >= 0 ? '▲' : '▼'} {label} {Math.abs(delta)}%
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* 4 Financial Ratios Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Ratio 1: Dana Darurat */}
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold">
            <Vault size={16} className="text-income shrink-0" weight="duotone" />
            <span className="truncate">Ketahanan Kas</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-text tabular-nums">
            {emergencyFundMonths} <span className="text-xs font-semibold text-text-muted">Bulan</span>
          </p>
          <p className="text-[10px] text-text-muted">Ideal: Minimal 3 - 6 Bulan</p>
        </div>

        {/* Ratio 2: Savings Rate */}
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold">
            <TrendUp size={16} className="text-income shrink-0" weight="bold" />
            <span className="truncate">Rasio Tabungan</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-income tabular-nums">
            {savingsRate}%
          </p>
          <p className="text-[10px] text-text-muted">Ideal: &gt;= 20% dari Pemasukan</p>
        </div>

        {/* Ratio 3: Debt to Income */}
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold">
            <Receipt size={16} className="text-expense shrink-0" weight="duotone" />
            <span className="truncate">Beban Hutang</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-text tabular-nums">
            {dtiRatio}%
          </p>
          <p className="text-[10px] text-text-muted">Batas Aman: &lt;= 30%</p>
        </div>

        {/* Ratio 4: Nilai Buku Aset */}
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold">
            <Package size={16} className="text-primary shrink-0" weight="duotone" />
            <span className="truncate">Nilai Buku Aset</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
            {formatRupiah(totalAssetBookValue)}
          </p>
          <p className="text-[10px] text-text-muted">{assets.length} aset terdaftar</p>
        </div>
      </div>

      {/* Actionable Recommendations Section */}
      <div className="p-4 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-text font-bold text-xs sm:text-sm">
          <Lightbulb size={18} className="text-income" weight="duotone" />
          <span>Analisis & Rekomendasi Keuangan Anda</span>
        </div>

        <div className="space-y-2">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs transition-colors ${
                item.type === 'warning'
                  ? 'bg-expense/5 border-expense/20 text-text'
                  : item.type === 'success'
                  ? 'bg-primary/5 border-primary/20 text-text'
                  : 'bg-surface-2 border-border/70 text-text'
              }`}
            >
              {item.type === 'warning' ? (
                <Warning size={18} className="text-expense shrink-0 mt-0.5" weight="fill" />
              ) : item.type === 'success' ? (
                <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
              ) : (
                <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
              )}
              <div className="space-y-0.5 min-w-0">
                <p className="font-bold text-xs leading-tight">{item.title}</p>
                <p className="text-[11px] text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
