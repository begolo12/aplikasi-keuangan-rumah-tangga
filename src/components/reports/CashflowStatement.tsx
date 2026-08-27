'use client';

import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scales,
  CheckCircle,
  WarningCircle,
  Sparkle,
  TrendUp,
  TrendDown,
  ArrowsLeftRight,
  FileCsv,
} from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { MonthlySummary as MonthlySummaryType } from '@/lib/types';

interface CashflowStatementProps {
  summary: MonthlySummaryType | null;
  selectedMonth: number;
  selectedYear: number;
  onExportCsv?: () => void;
}

export function CashflowStatement({
  summary,
  selectedMonth,
  selectedYear,
  onExportCsv,
}: CashflowStatementProps) {
  if (!summary) return null;

  const totalIncome = summary.total_income || 0;
  const totalExpense = summary.total_expense || 0;
  const netCashflow = summary.net_cash_flow || 0;
  const isSurplus = netCashflow >= 0;
  const totalTransfer = summary.total_transfer || 0;
  const currentTotalBalance = summary.total_balance || 0;

  // Estimasi saldo awal bulan = Saldo Akhir - Net Cashflow
  const estimatedStartingBalance = currentTotalBalance - netCashflow;

  // Savings rate %
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netCashflow / totalIncome) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Hero Header Card: Surplus / Defisit Status */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xs ${
          isSurplus
            ? 'bg-income/5 border-income/25'
            : 'bg-expense/5 border-expense/25'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isSurplus ? 'bg-income text-white' : 'bg-expense text-white'
              }`}
            >
              {isSurplus ? <CheckCircle size={22} weight="fill" /> : <WarningCircle size={22} weight="fill" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-text">
                  Laporan Perputaran Kas & Tabungan
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isSurplus
                      ? 'bg-income/10 text-income border-income/30'
                      : 'bg-expense/10 text-expense border-expense/30 animate-pulse'
                  }`}
                >
                  {isSurplus ? 'Bulan Ini Uang Bertambah (+)' : 'Bulan Ini Uang Berkurang (-)'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                Periode {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          </div>

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[36px]"
            >
              <FileCsv size={16} weight="bold" />
              <span>Unduh CSV</span>
            </button>
          )}
        </div>

        {/* 3 Metrik Inti (Ringkas di HP, Mewah di PC) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-3">
          <div className="p-2.5 sm:p-3.5 bg-surface rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Total Kas Masuk</span>
            <p className="text-xs sm:text-base md:text-lg font-extrabold text-income tabular-nums whitespace-nowrap">
              +{formatRupiah(totalIncome)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Pemasukan & Piutang</span>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-surface rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Total Kas Keluar</span>
            <p className="text-xs sm:text-base md:text-lg font-extrabold text-expense tabular-nums whitespace-nowrap">
              -{formatRupiah(totalExpense)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Pengeluaran & Cicilan</span>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-surface rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Arus Kas Bersih</span>
            <p
              className={`text-xs sm:text-base md:text-lg font-extrabold tabular-nums whitespace-nowrap ${
                isSurplus ? 'text-income' : 'text-expense'
              }`}
            >
              {isSurplus ? '+' : ''}{formatRupiah(netCashflow)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">
              {isSurplus ? `Tabungan ${savingsRate}%` : 'Uang Berkurang'}
            </span>
          </div>
        </div>

        {/* Insight Ringkas Arus Kas */}
        <div className="pt-1 text-xs text-text-muted flex items-start gap-2">
          <Sparkle size={16} weight="fill" className={isSurplus ? 'text-income shrink-0 mt-0.5' : 'text-expense shrink-0 mt-0.5'} />
          <p className="text-[11px] leading-relaxed">
            {isSurplus
              ? `Arus kas Anda berada pada posisi surplus sebesar ${formatRupiah(netCashflow)} (${savingsRate}% dari pemasukan). Uang Anda bertambah di akhir bulan.`
              : `Arus kas Anda mengalami defisit sebesar ${formatRupiah(Math.abs(netCashflow))}. Pengeluaran melebihi pemasukan bulan ini.`}
          </p>
        </div>
      </div>

      {/* Desktop Detailed Statement (Full Data Breakdown) */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h4 className="text-xs sm:text-sm font-bold text-text">
            Rincian Arus Kas & Perubahan Saldo
          </h4>
          <span className="text-[11px] text-text-muted font-medium">Standar Laporan Arus Kas</span>
        </div>

        <div className="space-y-2 text-xs">
          {/* 1. Saldo Awal Periode */}
          <div className="flex items-center justify-between py-1.5 px-2 bg-surface-2/60 rounded-xl">
            <span className="font-semibold text-text-muted">Saldo Kas Awal Bulan (Estimasi)</span>
            <span className="font-bold text-text tabular-nums">{formatRupiah(estimatedStartingBalance)}</span>
          </div>

          {/* 2. Arus Masuk */}
          <div className="flex items-center justify-between py-1.5 px-2">
            <span className="font-medium text-text flex items-center gap-1.5">
              <TrendUp size={14} className="text-income" weight="bold" />
              <span>Total Pemasukan Operasional (Kas Masuk)</span>
            </span>
            <span className="font-bold text-income tabular-nums">+{formatRupiah(totalIncome)}</span>
          </div>

          {/* 3. Arus Keluar */}
          <div className="flex items-center justify-between py-1.5 px-2">
            <span className="font-medium text-text flex items-center gap-1.5">
              <TrendDown size={14} className="text-expense" weight="bold" />
              <span>Total Pengeluaran Belanja & Tagihan (Kas Keluar)</span>
            </span>
            <span className="font-bold text-expense tabular-nums">-{formatRupiah(totalExpense)}</span>
          </div>

          {/* 4. Mutasi Transfer */}
          {totalTransfer > 0 && (
            <div className="flex items-center justify-between py-1 px-2 text-text-muted text-[11px]">
              <span className="flex items-center gap-1.5">
                <ArrowsLeftRight size={13} />
                <span>Perpindahan Dana / Transfer Internal Antar Rekening</span>
              </span>
              <span className="font-semibold tabular-nums">{formatRupiah(totalTransfer)}</span>
            </div>
          )}

          {/* 5. Perubahan Bersih */}
          <div className="flex items-center justify-between py-2 px-2 border-t border-b border-border/80 font-bold">
            <span className="text-text">Kenaikan / Penurunan Kas Bersih</span>
            <span className={`tabular-nums ${isSurplus ? 'text-income' : 'text-expense'}`}>
              {isSurplus ? '+' : ''}{formatRupiah(netCashflow)}
            </span>
          </div>

          {/* 6. Saldo Akhir */}
          <div className="flex items-center justify-between py-2 px-2.5 bg-primary/10 border border-primary/20 rounded-xl font-extrabold text-sm">
            <span className="text-primary">Saldo Kas Riil Akhir Periode</span>
            <span className="text-primary tabular-nums">{formatRupiah(currentTotalBalance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
