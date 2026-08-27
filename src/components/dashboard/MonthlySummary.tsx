'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, Scales, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { MonthlySummary as MonthlySummaryType } from '@/lib/types';
import { formatCompactRupiah, formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';

interface MonthlySummaryProps {
  summary: MonthlySummaryType;
}

export function MonthlySummary({ summary }: MonthlySummaryProps) {
  const isSurplus = summary.net_cash_flow >= 0;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs sm:text-sm md:text-base font-bold text-text">
          Arus Kas Bulan Ini ({INDONESIAN_MONTHS[summary.month - 1]} {summary.year})
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
          <span
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold ${
              isSurplus
                ? 'bg-income/10 text-income border-income/20'
                : 'bg-expense/10 text-expense border-expense/20 animate-pulse'
            }`}
          >
            {isSurplus ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} weight="fill" />}
            <span>{isSurplus ? 'Kondisi Surplus' : 'Kondisi Defisit'}</span>
          </span>
        </div>
      </div>

      {/* Mobile: compact single-row strip */}
      <div className="md:hidden bg-surface border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="grid grid-cols-3 divide-x divide-border">
          {/* Income */}
          <div className="flex flex-col items-center justify-center py-2.5 px-1 gap-0.5">
            <div className="flex items-center gap-1 text-income">
              <ArrowUpRight size={13} weight="bold" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Pemasukan</span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-income tabular-nums">
              +{formatCompactRupiah(summary.total_income)}
            </p>
          </div>

          {/* Expense */}
          <div className="flex flex-col items-center justify-center py-2.5 px-1 gap-0.5">
            <div className="flex items-center gap-1 text-expense">
              <ArrowDownRight size={13} weight="bold" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Pengeluaran</span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-expense tabular-nums">
              -{formatCompactRupiah(summary.total_expense)}
            </p>
          </div>

          {/* Net Cashflow */}
          <div className={`flex flex-col items-center justify-center py-2.5 px-1 gap-0.5 ${isSurplus ? 'bg-income/5' : 'bg-expense/5'}`}>
            <div className={`flex items-center gap-1 ${isSurplus ? 'text-income' : 'text-expense'}`}>
              <Scales size={13} weight="bold" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Arus Kas</span>
            </div>
            <p className={`text-xs sm:text-sm font-extrabold tabular-nums ${isSurplus ? 'text-income' : 'text-expense'}`}>
              {isSurplus ? '+' : ''}{formatCompactRupiah(summary.net_cash_flow)}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop: 3 separate cards */}
      <div className="hidden md:grid grid-cols-3 gap-2.5">
        {/* Income Card */}
        <div className="p-3 md:p-3.5 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-2xs min-w-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">Total Pemasukan</p>
            <p className="text-base md:text-lg font-extrabold text-income whitespace-nowrap tabular-nums">
              +{formatRupiah(summary.total_income)}
            </p>
          </div>
          <div className="w-9 h-9 bg-income/10 text-income rounded-xl flex items-center justify-center border border-income/20 shrink-0">
            <ArrowUpRight size={17} weight="bold" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="p-3 md:p-3.5 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-2xs min-w-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">Total Pengeluaran</p>
            <p className="text-base md:text-lg font-extrabold text-expense whitespace-nowrap tabular-nums">
              -{formatRupiah(summary.total_expense)}
            </p>
          </div>
          <div className="w-9 h-9 bg-expense/10 text-expense rounded-2xl flex items-center justify-center border border-expense/20 shrink-0">
            <ArrowDownRight size={17} weight="bold" />
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className={`p-3 md:p-3.5 border rounded-2xl flex items-center justify-between shadow-2xs min-w-0 ${
          isSurplus ? 'bg-surface border-border' : 'bg-expense/5 border-expense/20'
        }`}>
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">
              {isSurplus ? 'Surplus Arus Kas' : 'Defisit Arus Kas'}
            </p>
            <p className={`text-base md:text-lg font-extrabold whitespace-nowrap tabular-nums ${isSurplus ? 'text-income' : 'text-expense'}`}>
              {isSurplus ? '+' : ''}{formatRupiah(summary.net_cash_flow)}
            </p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
            isSurplus ? 'bg-income/10 text-income border-income/20' : 'bg-expense/10 text-expense border-expense/20'
          }`}>
            <Scales size={17} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}
