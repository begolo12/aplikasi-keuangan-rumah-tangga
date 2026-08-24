'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, Scales, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { MonthlySummary as MonthlySummaryType } from '@/lib/types';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
        {/* Income Card */}
        <div className="p-2.5 sm:p-3 md:p-3.5 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-between shadow-2xs min-w-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-muted truncate">Total Pemasukan</p>
            <p className="text-sm sm:text-base md:text-lg font-extrabold text-income whitespace-nowrap tabular-nums">
              +{formatRupiah(summary.total_income)}
            </p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-income/10 text-income rounded-xl flex items-center justify-center border border-income/20 shrink-0">
            <ArrowUpRight size={17} weight="bold" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="p-2.5 sm:p-3 md:p-3.5 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-between shadow-2xs min-w-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-muted truncate">Total Pengeluaran</p>
            <p className="text-sm sm:text-base md:text-lg font-extrabold text-expense whitespace-nowrap tabular-nums">
              -{formatRupiah(summary.total_expense)}
            </p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-expense/10 text-expense rounded-2xl flex items-center justify-center border border-expense/20 shrink-0">
            <ArrowDownRight size={17} weight="bold" />
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="p-2.5 sm:p-3 md:p-3.5 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-between shadow-2xs min-w-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-muted truncate">Arus Kas Bersih (Selisih)</p>
            <p className={`text-sm sm:text-base md:text-lg font-extrabold whitespace-nowrap tabular-nums ${isSurplus ? 'text-primary' : 'text-expense'}`}>
              {isSurplus ? '+' : ''}{formatRupiah(summary.net_cash_flow)}
            </p>
          </div>
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              isSurplus
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-expense/10 text-expense border-expense/20'
            }`}
          >
            <Scales size={17} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}
