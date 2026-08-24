'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MonthlySummary as MonthlySummaryType } from '@/lib/types';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import { CategoryChart } from './CategoryChart';
import { CashflowChart } from './CashflowChart';
import { Button } from '../ui/Button';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
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

interface ReportsViewProps {
  summary?: MonthlySummaryType;
  currentMonth: number;
  currentYear: number;
}

export function ReportsView({ summary: initialSummary, currentMonth, currentYear }: ReportsViewProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryDatum[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [reportSummary, setReportSummary] = useState<MonthlySummaryType | null>(initialSummary || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [catData, monthData] = await Promise.all([
          apiFetch<{ categories?: CategoryDatum[]; total?: number }>(
            `${endpoints.reportsCategory(currentMonth, currentYear)}&type=expense`,
            { signal }
          ),
          apiFetch<{ summary?: MonthlySummaryType; daily_trends?: DailyTrend[] }>(
            endpoints.reportsMonthly(currentMonth, currentYear),
            { signal }
          ),
        ]);
        setCategoryData(catData.categories || []);
        setCategoryTotal(catData.total || 0);
        setDailyTrends(monthData.daily_trends || []);
        if (monthData.summary) {
          setReportSummary(monthData.summary);
        }
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
  }, [currentMonth, currentYear, reloadKey]);

  const retry = () => setReloadKey((k) => k + 1);

  if (isLoading) {
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
    window.open(`/api/reports/export-csv?month=${currentMonth}&year=${currentYear}`, '_blank');
  };

  const totalBal = reportSummary?.total_balance || 0;
  const pendingBills = reportSummary?.total_bills_pending_amount || 0;
  const payableDue = reportSummary?.total_payable_due || 0;
  const safeSpend = reportSummary?.safe_to_spend ?? (totalBal - (pendingBills + payableDue));

  return (
    <div className="space-y-6">
      {/* Header & Export Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text">Laporan Keuangan & Arus Kas</h2>
          <p className="text-xs md:text-sm text-text-muted">
            Periode {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          leftIcon={<FileCsv size={18} weight="bold" className="text-primary" />}
          onClick={handleExportCsv}
        >
          Ekspor CSV (Siap Excel)
        </Button>
      </div>

      {/* Arus Kas & Safe-to-Spend Liquidity Breakdown Card */}
      <div className="p-4 sm:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Sparkle size={20} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text">Ringkasan Likuiditas & Dana Bebas</h3>
              <p className="text-[11px] text-text-muted">
                Perhitungan uang riil keluarga setelah memperhitungkan seluruh kewajiban rutin.
              </p>
            </div>
          </div>

          <span
            className={`self-start sm:self-center text-xs font-bold px-3 py-1 rounded-full border ${
              safeSpend >= 0
                ? 'bg-income/10 text-income border-income/20'
                : 'bg-expense/10 text-expense border-expense/20'
            }`}
          >
            {safeSpend >= 0 ? 'Likuiditas Aman' : 'Kewajiban Melebihi Kas'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-surface-2 rounded-2xl space-y-0.5">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
              <ShieldCheck size={14} className="text-primary" />
              <span>Total Saldo Kas Riil</span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-text">{formatRupiah(totalBal)}</p>
          </div>

          <div className="p-3 bg-surface-2 rounded-2xl space-y-0.5">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
              <Receipt size={14} className="text-purple-500" />
              <span>Tagihan Belum Bayar</span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-purple-600 dark:text-purple-400">
              {formatRupiah(pendingBills)}
            </p>
          </div>

          <div className="p-3 bg-surface-2 rounded-2xl space-y-0.5">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
              <HandCoins size={14} className="text-expense" />
              <span>Sisa Hutang Berjalan</span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-expense">{formatRupiah(payableDue)}</p>
          </div>

          <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl space-y-0.5">
            <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold">
              <Sparkle size={14} weight="fill" />
              <span>Dana Bebas (Safe-to-Spend)</span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-primary">{formatRupiah(safeSpend)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-border">
            <span className="text-text-muted flex items-center gap-1">
              <TrendUp size={14} className="text-income" /> Pemasukan Bulan Ini
            </span>
            <span className="font-bold text-income">{formatRupiah(reportSummary?.total_income || 0)}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-border">
            <span className="text-text-muted flex items-center gap-1">
              <TrendDown size={14} className="text-expense" /> Pengeluaran Bulan Ini
            </span>
            <span className="font-bold text-expense">{formatRupiah(reportSummary?.total_expense || 0)}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Komposisi Pengeluaran Kategori */}
        <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <ChartPieSlice size={20} weight="duotone" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-text">Komposisi Pengeluaran</h3>
            </div>
            <span className="text-xs font-bold text-expense">{formatRupiah(categoryTotal)}</span>
          </div>

          <CategoryChart data={categoryData} total={categoryTotal} />
        </div>

        {/* Card 2: Tren Arus Kas Harian */}
        <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <ChartBar size={20} weight="duotone" />
            </div>
            <h3 className="text-sm md:text-base font-bold text-text">Tren Arus Kas Harian</h3>
          </div>

          <CashflowChart data={dailyTrends} />
        </div>
      </div>
    </div>
  );
}
