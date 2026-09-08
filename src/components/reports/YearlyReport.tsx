'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, endpoints, ApiError } from '@/lib/apiFetch';
import { YearlyReportData, YearlyCategoryDatum } from '@/lib/types';
import { formatRupiah, formatCompactRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import {
  ChartLineUp,
  TrendUp,
  TrendDown,
  CaretLeft,
  CaretRight,
  ChartPieSlice,
  PiggyBank,
  ArrowsDownUp,
} from '@phosphor-icons/react';

interface YearlyReportProps {
  initialYear: number;
}

function DeltaBadge({ cat }: { cat: YearlyCategoryDatum }) {
  if (cat.delta_pct === null) {
    return <span className="text-[10px] font-bold text-text-muted">Baru</span>;
  }
  const pct = Math.round(cat.delta_pct);
  if (pct === 0) {
    return <span className="text-[10px] font-bold text-text-muted">Stabil</span>;
  }
  const isUp = pct > 0;
  return (
    <span
      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${
        isUp ? 'bg-expense/10 text-expense border-expense/20' : 'bg-income/10 text-income border-income/20'
      }`}
      title={`Tahun lalu: ${formatRupiah(cat.previous_amount)}`}
    >
      {isUp ? <TrendUp size={10} weight="bold" className="inline mr-0.5" /> : <TrendDown size={10} weight="bold" className="inline mr-0.5" />}
      {isUp ? '+' : ''}
      {pct}%
    </span>
  );
}

export function YearlyReport({ initialYear }: YearlyReportProps) {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<YearlyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchYearly = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiFetch<YearlyReportData>(endpoints.reportsYearly(year), { signal: controller.signal });
        setData(result);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat laporan tahunan.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchYearly();
    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [year]);

  const maxAmount = Math.max(1, ...(data?.months.map((m) => Math.max(m.income, m.expense)) ?? [1]));

  if (isLoading && !data) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border border-expense/25 bg-expense/5 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-expense">{error}</p>
        <Button variant="primary" onClick={() => setYear((y) => y)}>Muat ulang</Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header + Year Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 sm:p-4 rounded-3xl border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-extrabold text-text flex items-center gap-2">
            <ChartLineUp size={18} weight="duotone" className="text-primary" />
            Laporan Tahunan {year}
          </h3>
          <p className="text-xs text-text-muted">Tren 12 bulan, perbandingan tahunan, dan tabungan bersih.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-2xl border border-border self-start">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Tahun sebelumnya"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-3 text-text transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="px-3 text-sm font-extrabold text-text">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Tahun berikutnya"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-3 text-text transition-colors"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Ringkasan Tabungan Bersih */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-text-muted flex items-center gap-1">
            <TrendUp size={13} className="text-income" weight="bold" /> Pemasukan Setahun
          </p>
          <p className="text-sm font-extrabold text-income tabular-nums">{formatRupiah(data.total_income)}</p>
        </div>
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-text-muted flex items-center gap-1">
            <TrendDown size={13} className="text-expense" weight="bold" /> Pengeluaran Setahun
          </p>
          <p className="text-sm font-extrabold text-expense tabular-nums">{formatRupiah(data.total_expense)}</p>
        </div>
        <div className={`p-3 rounded-2xl space-y-1 border ${data.net_savings >= 0 ? 'bg-income/10 border-income/20' : 'bg-expense/10 border-expense/20'}`}>
          <p className="text-[10px] font-semibold text-text-muted flex items-center gap-1">
            <PiggyBank size={13} className={data.net_savings >= 0 ? 'text-income' : 'text-expense'} weight="bold" /> Tabungan Bersih
          </p>
          <p className={`text-sm font-extrabold tabular-nums ${data.net_savings >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatRupiah(data.net_savings)}
          </p>
        </div>
        <div className="p-3 bg-surface border border-border rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-text-muted">Savings Rate</p>
          <p className={`text-sm font-extrabold tabular-nums ${data.savings_rate_pct >= 0 ? 'text-primary' : 'text-expense'}`}>
            {data.savings_rate_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Grafik Garis / Bar 12 Bulan */}
      <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold text-text">Arus Kas per Bulan</h4>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-income inline-block" /> Pemasukan</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-expense inline-block" /> Pengeluaran</span>
          </div>
        </div>

        <div className="flex items-end gap-1.5 sm:gap-2 h-44">
          {data.months.map((m) => {
            const incomeH = (m.income / maxAmount) * 100;
            const expenseH = (m.expense / maxAmount) * 100;
            const hasData = m.income > 0 || m.expense > 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
                <div className="w-full flex items-end justify-center gap-[3px] flex-1">
                  <div
                    className="w-1/2 max-w-[14px] rounded-t-md bg-income/85 min-h-[2px] transition-all"
                    style={{ height: `${incomeH}%` }}
                    title={`Pemasukan ${INDONESIAN_MONTHS[m.month - 1]}: ${formatRupiah(m.income)}`}
                  />
                  <div
                    className="w-1/2 max-w-[14px] rounded-t-md bg-expense/85 min-h-[2px] transition-all"
                    style={{ height: `${expenseH}%` }}
                    title={`Pengeluaran ${INDONESIAN_MONTHS[m.month - 1]}: ${formatRupiah(m.expense)}`}
                  />
                </div>
                <span className={`text-[9px] font-bold ${hasData ? 'text-text' : 'text-text-muted/50'}`}>
                  {INDONESIAN_MONTHS[m.month - 1].slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ringkasan net per bulan (teks ringkas) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
          {data.months.map((m) => (
            <div
              key={m.month}
              title={`${INDONESIAN_MONTHS[m.month - 1]}: masuk ${formatRupiah(m.income)}, keluar ${formatRupiah(m.expense)}`}
              className={`px-1.5 py-1 rounded-lg text-center border ${
                m.net > 0 ? 'bg-income/5 border-income/20' : m.net < 0 ? 'bg-expense/5 border-expense/20' : 'bg-surface-2 border-border/40'
              }`}
            >
              <p className="text-[9px] font-bold text-text-muted">{INDONESIAN_MONTHS[m.month - 1].slice(0, 3)}</p>
              <p className={`text-[9px] font-extrabold tabular-nums ${m.net >= 0 ? 'text-income' : 'text-expense'}`}>
                {m.net === 0 ? '-' : formatCompactRupiah(m.net)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Kategori */}
      {data.top_categories.length > 0 && (
        <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
          <h4 className="text-xs sm:text-sm font-bold text-text flex items-center gap-2">
            <ChartPieSlice size={16} weight="duotone" className="text-primary" />
            Top 5 Kategori Pengeluaran {year}
          </h4>
          <ul className="space-y-2">
            {data.top_categories.map((c, i) => {
              const max = data.top_categories[0].current_amount || 1;
              return (
                <li key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-text truncate">
                      {i + 1}. {c.name}
                    </span>
                    <span className="font-extrabold text-expense tabular-nums whitespace-nowrap">{formatRupiah(c.current_amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-expense/70"
                      style={{ width: `${(c.current_amount / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Tabel YoY per Kategori */}
      {data.categories.length > 0 && (
        <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
          <h4 className="text-xs sm:text-sm font-bold text-text flex items-center gap-2">
            <ArrowsDownUp size={16} weight="duotone" className="text-primary" />
            Perbandingan YoY per Kategori ({year} vs {year - 1})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-text-muted text-[11px]">
                  <th className="py-2 pr-3 font-semibold">Kategori</th>
                  <th className="py-2 px-3 font-semibold text-right">{year}</th>
                  <th className="py-2 px-3 font-semibold text-right">{year - 1}</th>
                  <th className="py-2 pl-3 font-semibold text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {data.categories.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-2.5 pr-3 font-bold text-text">{c.name}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-expense tabular-nums">{formatRupiah(c.current_amount)}</td>
                    <td className="py-2.5 px-3 text-right text-text-muted tabular-nums">{formatRupiah(c.previous_amount)}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaBadge cat={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.categories.length === 0 && data.total_income === 0 && (
        <div className="p-6 bg-surface border border-border rounded-2xl text-center">
          <p className="text-xs text-text-muted">Belum ada transaksi pada tahun {year}.</p>
        </div>
      )}
    </div>
  );
}
