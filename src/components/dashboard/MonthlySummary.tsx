'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, Scales, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { MonthlySummary as MonthlySummaryType } from '@/lib/types';
import { formatCompactRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';

interface MonthlySummaryProps {
  summary: MonthlySummaryType;
}

export function MonthlySummary({ summary }: MonthlySummaryProps) {
  const isSurplus = summary.net_cash_flow >= 0;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs sm:text-sm md:text-base font-bold text-text">
          Ringkasan Arus Kas ({INDONESIAN_MONTHS[summary.month - 1]} {summary.year})
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold">
          {isSurplus ? (
            <span className="flex items-center gap-1 text-income font-bold">
              <CheckCircle size={13} weight="fill" />
              <span>Surplus</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-expense font-bold">
              <WarningCircle size={13} weight="fill" />
              <span>Defisit</span>
            </span>
          )}
        </div>
      </div>

      {/* Mobile: compact single-row strip */}
      <div className="md:hidden bg-surface border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="grid grid-cols-3 divide-x divide-border">
          {/* Income */}
          <div className="flex flex-col items-center justify-center py-3 px-1 gap-1">
            <div className="flex items-center gap-1 text-income">
              <ArrowUpRight size={14} weight="bold" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Masuk</span>
            </div>
            <p className="text-sm font-extrabold text-income tabular-nums">
              +{formatCompactRupiah(summary.total_income)}
            </p>
          </div>

          {/* Expense */}
          <div className="flex flex-col items-center justify-center py-3 px-1 gap-1">
            <div className="flex items-center gap-1 text-expense">
              <ArrowDownRight size={14} weight="bold" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Keluar</span>
            </div>
            <p className="text-sm font-extrabold text-expense tabular-nums">
              -{formatCompactRupiah(summary.total_expense)}
            </p>
          </div>

          {/* Net */}
          <div className="flex flex-col items-center justify-center py-3 px-1 gap-1">
            <div className={`flex items-center gap-1 ${isSurplus ? 'text-primary' : 'text-expense'}`}>
              <Scales size={14} weight="bold" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Selisih</span>
            </div>
            <p className={`text-sm font-extrabold tabular-nums ${isSurplus ? 'text-primary' : 'text-expense'}`}>
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
              +{formatCompactRupiah(summary.total_income)}
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
              -{formatCompactRupiah(summary.total_expense)}
            </p>
          </div>
          <div className="w-9 h-9 bg-expense/10 text-expense rounded-2xl flex items-center justify-center border border-expense/20 shrink-0">
            <ArrowDownRight size={17} weight="bold" />
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="p-3 md:p-3.5 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-2xs min-w-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">Arus Kas Bersih</p>
            <p className={`text-base md:text-lg font-extrabold whitespace-nowrap tabular-nums ${isSurplus ? 'text-primary' : 'text-expense'}`}>
              {isSurplus ? '+' : ''}{formatCompactRupiah(summary.net_cash_flow)}
            </p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
            isSurplus ? 'bg-primary/10 text-primary border-primary/20' : 'bg-expense/10 text-expense border-expense/20'
          }`}>
            <Scales size={17} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}
