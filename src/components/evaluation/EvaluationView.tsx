'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MonthlySummary as MonthlySummaryType, Debt, Asset, Budget, Wallet, RecurringBill } from '@/lib/types';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { calculateColdMoney } from '../reports/ColdMoneyCard';
import { totalLiquidCash } from '@/lib/money';
import { buildMonthlyDecision } from '@/lib/decisionSummary';
import { DecisionCard } from './DecisionCard';
import { CollapseForecastCard } from './CollapseForecastCard';
import { ScenarioSimulator } from './ScenarioSimulator';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import { ProgressBar } from '../ui/ProgressBar';
import { StatCard, StatGrid } from '../ui/StatCard';
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
  budgets?: Budget[];
  wallets?: Wallet[];
  bills?: RecurringBill[];
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
  budgets = [],
  wallets = [],
  bills: billsProp,
}: EvaluationViewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [billsState, setBillsState] = useState<RecurringBill[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [prev, setPrev] = useState<PrevSummary | null>(null);

  const bills = (billsProp && billsProp.length > 0) ? billsProp : billsState;

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
    // Jika bills tidak dikirim via prop, fetch mandiri (fallback untuk akses langsung)
    if (!billsProp || billsProp.length === 0) {
      apiFetch<{ bills: RecurringBill[] }>(endpoints.bills)
        .then((res) => {
          if (isMounted && res.bills) setBillsState(res.bills);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [billsProp]);

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

  // Putusan akhir bulan: hooks harus di atas early-return (rules-of-hooks).
  const safeSummary = {
    total_income: summary?.total_income ?? 0,
    total_expense: summary?.total_expense ?? 0,
    net_cash_flow: summary?.net_cash_flow ?? 0,
    total_bills_pending_amount: summary?.total_bills_pending_amount ?? 0,
    total_payable_due: summary?.total_payable_due ?? 0,
  };

  const coldMoneyInfo = useMemo(
    () =>
      calculateColdMoney(
        wallets,
        budgets,
        safeSummary.total_expense,
        safeSummary.total_bills_pending_amount,
        safeSummary.total_payable_due,
        bills,
        debts
      ),
    [wallets, budgets, safeSummary.total_expense, safeSummary.total_bills_pending_amount, safeSummary.total_payable_due, bills, debts]
  );

  const topOverspentCategory = useMemo(() => {
    const worst = budgets
      .filter((b) => (b.percentage ?? 0) > 100)
      .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0];
    if (!worst) return null;
    return {
      name: worst.category_name || 'Pos belanja',
      pct: Math.round(worst.percentage),
      overAmount: Math.max(0, (worst.spent || 0) - (worst.monthly_limit || 0)),
    };
  }, [budgets]);

  const monthlyDecision = useMemo(
    () =>
      buildMonthlyDecision({
        hasAnyTransaction: safeSummary.total_income > 0 || safeSummary.total_expense > 0,
        netCashFlow: safeSummary.net_cash_flow,
        coldMoneyAmount: coldMoneyInfo.cold_money,
        coldMoneyGap:
          coldMoneyInfo.safety_reserve_required + coldMoneyInfo.pending_obligations - coldMoneyInfo.total_liquid_cash,
        topOverspent: topOverspentCategory,
      }),
    [safeSummary.total_income, safeSummary.total_expense, safeSummary.net_cash_flow, coldMoneyInfo, topOverspentCategory]
  );

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

  // Kekayaan bersih = kas + nilai buku aset + piutang - hutang
  const netWorth = totalCash + totalAssetBookValue + totalReceivableRemaining - totalPayableRemaining;

  // Emergency Fund & Risk Buffer KPI: Wajib 4 Bulan Biaya + 10% Cadangan Risiko (4.4x Anggaran)
  // Kebutuhan bulanan otomatis = anggaran manual + tagihan rutin aktif + cicilan hutang (ponytail: sum konservatif)
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const activeBillsTotal = bills.filter((b) => b.is_active && (b.type ?? 'expense') === 'expense').reduce((sum, b) => sum + (b.amount || 0), 0);
  const activeDebtInstallments = debts
    .filter((d) => d.type === 'payable' && d.status !== 'paid' && (d.monthly_installment || 0) > 0)
    .reduce((sum, d) => sum + (d.monthly_installment || 0), 0);
  const combinedBudgetForBenchmark = totalBudgetFromLimits + activeBillsTotal + activeDebtInstallments;
  const expenseBenchmark = combinedBudgetForBenchmark > 0 ? combinedBudgetForBenchmark : monthlyExpense > 0 ? monthlyExpense : 0;
  const reserve4Months = expenseBenchmark * 4;
  const riskBuffer10Pct = reserve4Months * 0.1;
  const totalMinSafetyRequired = reserve4Months + riskBuffer10Pct; // 4.4x
  
  // Saldo tabungan/kas dana darurat. Dompet semacam ini tidak pernah minus;
  // bila tidak ada dompet tabungan, seluruh kas siap pakai dipakai sebagai cadangan.
  const savingsWallets = wallets.filter((w) => w.type === 'savings');
  const currentEmergencyFund = savingsWallets.length > 0
    ? totalLiquidCash(savingsWallets)
    : totalLiquidCash(wallets);
    
  const emergencyFundMonths = expenseBenchmark > 0 ? Math.round((currentEmergencyFund / expenseBenchmark) * 10) / 10 : 0;
  const safetyPlanProgressPct = totalMinSafetyRequired > 0 ? Math.min(100, Math.round((currentEmergencyFund / totalMinSafetyRequired) * 100)) : 0;
  // Bila belum ada kebutuhan bulanan (expenseBenchmark 0) → anggap belum ada target, jadi tidak "terpenuhi" secara semu
  const isSafetyPlanMet = expenseBenchmark > 0 && currentEmergencyFund >= totalMinSafetyRequired;

  // Savings Rate %
  const savingsRate = monthlyIncome > 0
    ? Math.max(0, Math.round((netCashFlow / monthlyIncome) * 100))
    : 0;

  // Debt to Income Ratio (DTI %). null = belum ada pemasukan, rasio tidak bisa dihitung.
  const dtiRatio = monthlyIncome > 0
    ? Math.round((totalPayableRemaining / monthlyIncome) * 100)
    : null;

  // Rasio hutang vs harta. null = kekayaan bersih belum positif, rasio tidak bermakna.
  const derRatio = netWorth > 0
    ? Math.round((totalPayableRemaining / netWorth) * 100)
    : null;

  // Tidak ada satu pun angka keuangan = belum ada yang bisa dinilai.
  const hasAnyFinancialData =
    monthlyIncome !== 0 ||
    monthlyExpense !== 0 ||
    totalCash !== 0 ||
    totalAssetBookValue !== 0 ||
    totalPayableRemaining !== 0 ||
    totalReceivableRemaining !== 0 ||
    totalBudgetFromLimits !== 0 ||
    activeBillsTotal !== 0;

  // Financial Health Scoring (0 - 100). null = belum ada data, bukan nilai 0.
  let scoreValue: number | null = null;

  if (hasAnyFinancialData) {
    let score = 50; // base score

    // Cashflow surplus factor (+20 or -20)
    if (monthlyIncome > 0) {
      if (netCashFlow > 0) score += 20;
      else if (netCashFlow < 0) score -= 20;
    } else if (monthlyExpense === 0) {
      score += 10;
    }

    // Emergency fund factor (Aturan 4 Bulan + 10% Risiko: +20 if >= 4.4x, +10 if >= 2x, -20 if < 1x)
    if (isSafetyPlanMet) score += 20;
    else if (emergencyFundMonths >= 2) score += 10;
    else if (emergencyFundMonths >= 1) score += 5;
    else score -= 20;

    // Savings rate factor (+10 if >= 20%)
    if (savingsRate >= 20) score += 10;
    else if (savingsRate >= 10) score += 5;

    // DER & Debt burden factor
    if (derRatio === null) score += 0;
    else if (derRatio <= 35) score += 10;
    else if (derRatio <= 70) score += 5;
    else score -= 15;

    // Budget adherence
    if (summary.budget_over_count === 0) score += 5;
    else score -= 10;

    // Tanpa clamp bawah: skor jelek harus terlihat jelek, bukan dinaikkan ke 10.
    scoreValue = Math.max(0, Math.min(100, score));
  }

  const score = scoreValue;

  // Rating and color
  let scoreTitle = 'Belum Cukup Data';
  let scoreBadgeColor = 'bg-surface-2 text-text-muted border-border';
  let scoreBarColor = 'bg-border';

  if (score !== null) {
    scoreTitle = 'Kondisi Cukup Sehat (Stabil)';
    scoreBadgeColor = 'bg-income/10 text-income border-income/20';
    scoreBarColor = 'bg-income';

    if (score >= 80) {
      scoreTitle = 'Kondisi Sangat Sehat (Optimal)';
      scoreBadgeColor = 'bg-primary/10 text-primary border-primary/20';
      scoreBarColor = 'bg-primary';
    } else if (score < 60) {
      scoreTitle = 'Perlu Evaluasi & Penyesuaian';
      scoreBadgeColor = 'bg-expense/10 text-expense border-expense/20';
      scoreBarColor = 'bg-expense';
    }
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

  if (expenseBenchmark === 0) {
    insights.push({
      type: 'info',
      title: 'Belum Ada Kebutuhan Anggaran Bulanan',
      desc: `Belum ada anggaran manual, tagihan rutin, atau cicilan yang tercatat. Tetapkan anggaran atau catat tagihan rutin/cicilan agar KPI cadangan 4.4x dapat dihitung otomatis. Kas saat ini ${formatRupiah(currentEmergencyFund)} belum memiliki pembanding.`,
    });
  } else if (!isSafetyPlanMet) {
    const gap = totalMinSafetyRequired - currentEmergencyFund;
    insights.push({
      type: 'warning',
      title: 'Cadangan Dana Belum Mencapai Target Keamanan (4 Bulan Biaya + 10% Risiko)',
      desc: `Aturan KPI keuangan keluarga mensyaratkan memiliki cadangan minimal sebesar ${formatRupiah(totalMinSafetyRequired)} (Cadangan 4 Bulan ${formatRupiah(reserve4Months)} + Cadangan Risiko 10% ${formatRupiah(riskBuffer10Pct)}). Saat ini baru terkumpul ${formatRupiah(currentEmergencyFund)} (${safetyPlanProgressPct}% / setara ${emergencyFundMonths} bulan). Anda wajib memenuhi kekurangan ${formatRupiah(Math.max(0, gap))} sebelum menambah pos pengeluaran lain.`,
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Target Cadangan Keamanan 4.4x Anggaran Terpenuhi (Keuangan Sangat Aman)',
      desc: `Cadangan kas Anda (${formatRupiah(currentEmergencyFund)}) telah memenuhi standar KPI 4 bulan biaya + 10% risiko (${formatRupiah(totalMinSafetyRequired)}). Anda memiliki kelonggaran yang aman untuk ekspansi anggaran atau menambah pos pengeluaran baru.`,
    });
  }

  if (dtiRatio !== null && dtiRatio > 40) {
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
          <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Heartbeat size={22} className="text-primary" weight="duotone" />
            <span>Evaluasi & Kesehatan Finansial</span>
          </h2>
          <p className="text-xs text-text-muted">
            Analisis kondisi arus kas, rasio ketahanan dana darurat, beban hutang, dan kekayaan bersih periode {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}.
          </p>
        </div>
      </div>

      {/* Putusan Akhir Bulan: tiga baris jawaban atas pertanyaan keuangan keluarga */}
      <DecisionCard month={currentMonth} year={currentYear} decision={monthlyDecision} />

      {/* Main Score Hero Card */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Skor Kesehatan Keuangan
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums">
                {score === null ? '—' : score}
              </span>
              {score !== null && <span className="text-xs font-semibold text-text-muted">/ 100</span>}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${scoreBadgeColor}`}>
                {scoreTitle}
              </span>
            </div>
            {score === null && (
              <p className="text-[11px] text-text-muted max-w-xs">
                Catat pemasukan, pengeluaran, atau saldo dompet dulu agar skor bisa dihitung.
              </p>
            )}
          </div>

          {/* Net Worth Summary Strip */}
          <div className="p-3 bg-surface-2 border border-border/70 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scales size={22} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] text-text-muted block font-semibold">Estimasi Kekayaan Bersih</span>
              <span className="text-sm sm:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
                {formatRupiah(netWorth)}
              </span>
            </div>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <ProgressBar
            value={score ?? 0}
            size="md"
            barClassName={scoreBarColor}
            className="border border-border/40"
            ariaLabel={`Skor kesehatan keuangan ${score ?? 0} dari 100`}
          />
          <div className="flex justify-between text-[11px] text-text-muted">
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
                  className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border/60 text-[11px] font-semibold text-text-muted"
                >
                  {label}: belum ada pembanding
                </span>
              ) : (
                <span
                  key={label}
                  title={`Bulan lalu: ${delta >= 0 ? '+' : ''}${delta}%`}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold tabular-nums ${
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

      {/* Forecasting Colapse: jika pendapatan mati hari ini */}
      <CollapseForecastCard totalCash={totalCash} monthlyBurn={expenseBenchmark} />

      {/* Simulasi What-If: proyeksi hemat & tambah beban — dengan vonis + proyeksi 12 bulan */}
      <ScenarioSimulator
        monthlyIncome={safeSummary.total_income}
        monthlyExpense={safeSummary.total_expense}
        totalCash={totalCash}
        safetyReserve={totalMinSafetyRequired}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      {/* 4 Financial Ratios Grid */}
      <StatGrid layout="2-4-lg">
        <StatCard
          label="Cadangan (4 Bulan + 10%)"
          tone={isSafetyPlanMet ? 'primary' : 'expense'}
          icon={<Vault size={16} weight="duotone" />}
          iconClassName={isSafetyPlanMet ? 'text-primary' : 'text-expense'}
          value={
            <>
              {emergencyFundMonths}x{' '}
              <span className="text-xs font-semibold text-text-muted">({safetyPlanProgressPct}%)</span>
            </>
          }
          hint={isSafetyPlanMet ? 'Target 4.4x Anggaran Terpenuhi' : 'Wajib Capai 4.4x Anggaran'}
        />
        <StatCard
          label="Rasio Tabungan"
          tone="income"
          icon={<TrendUp size={16} weight="bold" />}
          value={`${savingsRate}%`}
          hint="Ideal: >= 20% dari Pemasukan"
        />
        <StatCard
          label="Rasio Hutang vs Harta"
          tone={derRatio === null ? 'muted' : derRatio <= 35 ? 'income' : 'expense'}
          icon={<Receipt size={16} weight="duotone" />}
          iconClassName={
            derRatio === null ? 'text-text-muted' : derRatio <= 35 ? 'text-income' : 'text-expense'
          }
          value={derRatio === null ? 'n/a' : `${derRatio}%`}
          hint={
            derRatio === null
              ? 'Belum bisa dihitung: aset bersih masih nol atau negatif'
              : 'Batas Aman: <= 35%'
          }
        />
        <StatCard
          label="Nilai Buku Aset"
          tone="primary"
          icon={<Package size={16} weight="duotone" />}
          value={formatRupiah(totalAssetBookValue)}
          hint={`${assets.length} aset terdaftar`}
        />
      </StatGrid>

      {/* Actionable Recommendations Section */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
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
