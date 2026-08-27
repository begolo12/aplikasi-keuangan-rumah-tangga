'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MonthlySummary as MonthlySummaryType, Wallet, Debt, Asset } from '@/lib/types';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import { CategoryChart } from './CategoryChart';
import { CashflowChart } from './CashflowChart';
import { CashflowStatement } from './CashflowStatement';
import { BalanceSheetReport } from './BalanceSheetReport';
import { IncomeStatementReport } from './IncomeStatementReport';
import { ColdMoneyCard } from './ColdMoneyCard';
import { Button } from '../ui/Button';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { Budget } from '@/lib/types';
import {
  FileCsv,
  ChartPieSlice,
  ChartBar,
  ShieldCheck,
  Receipt,
  HandCoins,
  Sparkle,
  TrendUp,
  TrendDown,
  CaretLeft,
  CaretRight,
  Calendar,
  ChartLineUp,
  Scales,
  Coins,
  BookOpen,
} from '@phosphor-icons/react';

interface CategoryDatum {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface DailyTrend {
  day: number;
  income: number;
  expense: number;
}

interface MonthHistoryItem {
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface ReportsViewProps {
  summary?: MonthlySummaryType;
  currentMonth: number;
  currentYear: number;
  onPeriodChange?: (month: number, year: number) => void;
}

export function ReportsView({
  summary: initialSummary,
  currentMonth: initialMonth,
  currentYear: initialYear,
  onPeriodChange,
}: ReportsViewProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'cashflow' | 'balancesheet' | 'incomestatement'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [reloadKey, setReloadKey] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryDatum[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [reportSummary, setReportSummary] = useState<MonthlySummaryType | null>(initialSummary || null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [historyList, setHistoryList] = useState<MonthHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedMonth(initialMonth);
    setSelectedYear(initialYear);
  }, [initialMonth, initialYear]);

  const handlePrevMonth = () => {
    let m = selectedMonth - 1;
    let y = selectedYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    if (onPeriodChange) onPeriodChange(m, y);
  };

  const handleNextMonth = () => {
    let m = selectedMonth + 1;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    if (onPeriodChange) onPeriodChange(m, y);
  };

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [catData, monthData, wData, bData, dData, aData] = await Promise.all([
          apiFetch<{ categories?: CategoryDatum[]; total?: number }>(
            `${endpoints.reportsCategory(selectedMonth, selectedYear)}&type=expense`,
            { signal }
          ),
          apiFetch<{ summary?: MonthlySummaryType; daily_trends?: DailyTrend[] }>(
            endpoints.reportsMonthly(selectedMonth, selectedYear),
            { signal }
          ),
          apiFetch<Wallet[]>(endpoints.wallets, { signal }).catch(() => []),
          apiFetch<Budget[]>(endpoints.budgets, { signal }).catch(() => []),
          apiFetch<Debt[]>(endpoints.debts, { signal }).catch(() => []),
          apiFetch<{ assets?: Asset[] }>(endpoints.assets, { signal }).catch(() => ({ assets: [] })),
        ]);
        setCategoryData(catData.categories || []);
        setCategoryTotal(catData.total || 0);
        setDailyTrends(monthData.daily_trends || []);
        if (monthData.summary) {
          setReportSummary(monthData.summary);
        }
        setWallets(wData || []);
        setBudgets(bData || []);
        setDebts(dData || []);
        setAssets(aData?.assets || []);

        // Fetch 4 bulan ke belakang untuk perbandingan histori bulanan
        const historyPromises = [];
        for (let i = 0; i < 4; i++) {
          let hm = selectedMonth - i;
          let hy = selectedYear;
          while (hm < 1) {
            hm += 12;
            hy -= 1;
          }
          historyPromises.push(
            apiFetch<{ summary?: MonthlySummaryType }>(endpoints.reportsMonthly(hm, hy), { signal })
              .then((res) => ({
                month: hm,
                year: hy,
                label: `${INDONESIAN_MONTHS[hm - 1]} ${hy}`,
                income: res.summary?.total_income || 0,
                expense: res.summary?.total_expense || 0,
                net: res.summary?.net_cash_flow || 0,
              }))
              .catch(() => null)
          );
        }

        const historyResults = await Promise.all(historyPromises);
        setHistoryList(historyResults.filter(Boolean) as MonthHistoryItem[]);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan jaringan.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [selectedMonth, selectedYear, reloadKey]);

  const retry = () => setReloadKey((k) => k + 1);

  if (isLoading && !reportSummary) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const handleExportCsv = () => {
    window.open(`/api/reports/export-csv?month=${selectedMonth}&year=${selectedYear}`, '_blank');
  };

  const totalBal = reportSummary?.total_balance || 0;
  const pendingBills = reportSummary?.total_bills_pending_amount || 0;
  const payableDue = reportSummary?.total_payable_due || 0;
  const safeSpend = reportSummary?.safe_to_spend ?? (totalBal - (pendingBills + payableDue));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header, Month Selector & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-3xl border border-border shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-text flex items-center gap-2">
            <Calendar size={20} className="text-primary" weight="duotone" />
            <span>Laporan Keuangan & Arus Kas</span>
          </h2>
          <p className="text-xs text-text-muted">
            Analisis arus kas, komposisi belanja, dan ringkasan keuangan per bulan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Month Switcher Controls */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-2xl border border-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
              aria-label="Bulan Sebelumnya"
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-3 text-text transition-colors"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="px-2 text-xs font-extrabold text-text min-w-[110px] text-center">
              {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
              aria-label="Bulan Berikutnya"
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-3 text-text transition-colors"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileCsv size={16} weight="bold" className="text-primary" />}
            onClick={handleExportCsv}
          >
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* Sub-Tab Switcher: 4 Pilar Laporan Keuangan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-surface border border-border rounded-2xl shadow-xs gap-1">
        <button
          type="button"
          onClick={() => setSelectedTab('overview')}
          className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all truncate ${
            selectedTab === 'overview'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <ChartPieSlice size={15} weight="bold" />
          <span className="truncate">Ringkasan & Kategori</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab('cashflow')}
          className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all truncate ${
            selectedTab === 'cashflow'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Scales size={15} weight="bold" />
          <span className="truncate">Arus Kas (Cashflow)</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab('balancesheet')}
          className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all truncate ${
            selectedTab === 'balancesheet'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Coins size={15} weight="bold" />
          <span className="truncate">Neraca Keuangan</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab('incomestatement')}
          className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all truncate ${
            selectedTab === 'incomestatement'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <BookOpen size={15} weight="bold" />
          <span className="truncate">Laba Rugi (P&L)</span>
        </button>
      </div>

      {selectedTab === 'cashflow' ? (
        <CashflowStatement
          summary={reportSummary}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onExportCsv={handleExportCsv}
        />
      ) : selectedTab === 'balancesheet' ? (
        <BalanceSheetReport
          summary={reportSummary}
          wallets={wallets}
          debts={debts}
          assets={assets}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onExportCsv={handleExportCsv}
        />
      ) : selectedTab === 'incomestatement' ? (
        <IncomeStatementReport
          summary={reportSummary}
          assets={assets}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onExportCsv={handleExportCsv}
        />
      ) : (
        <>
          {/* Uang Dingin & Dana Bebas Rencana Jangka Pendek Card */}
          <ColdMoneyCard
            wallets={wallets}
            budgets={budgets}
            totalExpense={reportSummary?.total_expense || 0}
            pendingBills={reportSummary?.total_bills_pending_amount || 0}
            payableDue={reportSummary?.total_payable_due || 0}
          />

          {/* Arus Kas & Safe-to-Spend Liquidity Breakdown Card */}
          <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-2.5 sm:space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <Sparkle size={16} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-text truncate">
                    Ringkasan Likuiditas {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <p className="text-[10px] text-text-muted hidden sm:block">
                    Perhitungan uang riil keluarga setelah memperhitungkan seluruh kewajiban rutin.
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  safeSpend >= 0
                    ? 'bg-income/10 text-income border-income/20'
                    : 'bg-expense/10 text-expense border-expense/20'
                }`}
              >
                {safeSpend >= 0 ? 'Likuiditas Aman' : 'Defisit Kewajiban'}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="p-2.5 bg-surface-2 rounded-xl flex flex-col justify-between gap-1 border border-border/40">
                <div className="flex items-center gap-1 text-text-muted text-[10px] sm:text-[11px] font-semibold">
                  <ShieldCheck size={14} className="text-primary shrink-0" weight="duotone" />
                  <span className="truncate">Kas Riil</span>
                </div>
                <p className={`text-xs sm:text-sm md:text-base font-extrabold whitespace-nowrap tabular-nums tracking-tight ${totalBal < 0 ? 'text-expense' : 'text-text'}`}>
                  {formatRupiah(totalBal)}
                </p>
              </div>

              <div className="p-2.5 bg-surface-2 rounded-xl flex flex-col justify-between gap-1 border border-border/40">
                <div className="flex items-center gap-1 text-text-muted text-[10px] sm:text-[11px] font-semibold">
                  <Receipt size={14} className="text-primary shrink-0" weight="duotone" />
                  <span className="truncate">Sisa Tagihan</span>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-extrabold text-primary whitespace-nowrap tabular-nums tracking-tight">
                  {formatRupiah(pendingBills)}
                </p>
              </div>

              <div className="p-2.5 bg-surface-2 rounded-xl flex flex-col justify-between gap-1 border border-border/40">
                <div className="flex items-center gap-1 text-text-muted text-[10px] sm:text-[11px] font-semibold">
                  <HandCoins size={14} className="text-expense shrink-0" weight="duotone" />
                  <span className="truncate">Sisa Hutang</span>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-extrabold text-expense whitespace-nowrap tabular-nums tracking-tight">
                  {formatRupiah(payableDue)}
                </p>
              </div>

              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl flex flex-col justify-between gap-1">
                <div className="flex items-center gap-1 text-primary text-[10px] sm:text-[11px] font-bold">
                  <Sparkle size={14} weight="fill" className="shrink-0" />
                  <span className="truncate">Dana Bebas</span>
                </div>
                <p className={`text-xs sm:text-sm md:text-base font-extrabold whitespace-nowrap tabular-nums tracking-tight ${safeSpend < 0 ? 'text-expense' : 'text-primary'}`}>
                  {formatRupiah(safeSpend)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="flex items-center justify-between gap-1.5 p-2 sm:p-2.5 bg-background rounded-xl border border-border">
                <span className="text-[10px] sm:text-xs font-medium text-text-muted flex items-center gap-1 shrink-0">
                  <TrendUp size={14} className="text-income shrink-0" weight="bold" /> Pemasukan
                </span>
                <span className="text-xs sm:text-sm font-bold text-income whitespace-nowrap tabular-nums text-right">
                  {formatRupiah(reportSummary?.total_income || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 p-2 sm:p-2.5 bg-background rounded-xl border border-border">
                <span className="text-[10px] sm:text-xs font-medium text-text-muted flex items-center gap-1 shrink-0">
                  <TrendDown size={14} className="text-expense shrink-0" weight="bold" /> Pengeluaran Realisasi
                </span>
                <span className="text-xs sm:text-sm font-bold text-expense whitespace-nowrap tabular-nums text-right">
                  {formatRupiah(reportSummary?.total_expense || 0)}
                </span>
              </div>
            </div>

            {/* Proyeksi Run-Rate Banner */}
            {(() => {
              const now = new Date();
              const isCurr = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
              const daysInM = new Date(selectedYear, selectedMonth, 0).getDate();
              const daysPass = isCurr ? Math.min(daysInM, Math.max(1, now.getDate())) : daysInM;
              const exp = reportSummary?.total_expense || 0;
              const projected = Math.round((exp / daysPass) * daysInM);
              return (
                <div className="p-2.5 bg-surface-2 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-text">
                    <ChartLineUp size={16} weight="bold" className="text-primary" />
                    <span>Proyeksi Pengeluaran Akhir Bulan (Run-rate):</span>
                  </div>
                  <span className="font-extrabold text-primary tabular-nums">{formatRupiah(projected)}</span>
                </div>
              );
            })()}
          </div>

          {/* 2-Column Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Card 1: Komposisi Pengeluaran Kategori */}
            <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-2.5 sm:space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                    <ChartPieSlice size={17} weight="duotone" />
                  </div>
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-text">Komposisi Pengeluaran</h3>
                </div>
                <span className="text-xs sm:text-sm font-bold text-expense whitespace-nowrap tabular-nums">{formatRupiah(categoryTotal)}</span>
              </div>

              <CategoryChart data={categoryData} total={categoryTotal} />
            </div>

            {/* Card 2: Tren Arus Kas Harian */}
            <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-2.5 sm:space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <ChartBar size={17} weight="duotone" />
                </div>
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-text">Tren Arus Kas Harian</h3>
              </div>

              <CashflowChart data={dailyTrends} />
            </div>
          </div>

          {/* Monthly Comparison History Table */}
          {historyList.length > 0 && (
            <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-text">
                  Riwayat Perbandingan 4 Bulan Terakhir
                </h3>
                <span className="text-[11px] text-text-muted">Tren Cashflow Bulanan</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-[11px]">
                      <th className="py-2 pr-3 font-semibold">Periode Bulan</th>
                      <th className="py-2 px-3 font-semibold text-right">Pemasukan</th>
                      <th className="py-2 px-3 font-semibold text-right">Pengeluaran</th>
                      <th className="py-2 pl-3 font-semibold text-right">Arus Kas Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-medium">
                    {historyList.map((item) => (
                      <tr key={`${item.year}-${item.month}`} className="hover:bg-surface-2 transition-colors">
                        <td className="py-2.5 pr-3 font-bold text-text flex items-center gap-1.5">
                          {item.month === selectedMonth && item.year === selectedYear && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-income tabular-nums">
                          {formatRupiah(item.income)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-expense tabular-nums">
                          {formatRupiah(item.expense)}
                        </td>
                        <td className={`py-2.5 pl-3 text-right font-extrabold tabular-nums ${item.net >= 0 ? 'text-income' : 'text-expense'}`}>
                          {item.net >= 0 ? '+' : ''}{formatRupiah(item.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
