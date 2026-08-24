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
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm md:text-base font-bold text-text">
          Ringkasan Arus Kas ({INDONESIAN_MONTHS[summary.month - 1]} {summary.year})
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {isSurplus ? (
            <span className="flex items-center gap-1 text-income font-bold">
              <CheckCircle size={14} weight="fill" />
              <span>Surplus</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-expense font-bold">
              <WarningCircle size={14} weight="fill" />
              <span>Defisit</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Income Card */}
        <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-xs min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">Total Pemasukan</p>
            <p className="text-base sm:text-lg md:text-xl font-extrabold text-income truncate">
              +{formatRupiah(summary.total_income)}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-income/10 text-income rounded-2xl flex items-center justify-center border border-income/20 shrink-0">
            <ArrowUpRight size={20} weight="bold" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-xs min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">Total Pengeluaran</p>
            <p className="text-base sm:text-lg md:text-xl font-extrabold text-expense truncate">
              -{formatRupiah(summary.total_expense)}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-expense/10 text-expense rounded-2xl flex items-center justify-center border border-expense/20 shrink-0">
            <ArrowDownRight size={20} weight="bold" />
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl flex items-center justify-between shadow-xs min-w-0">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 pr-2">
            <p className="text-xs font-semibold text-text-muted truncate">Arus Kas Bersih (Selisih)</p>
            <p className={`text-base sm:text-lg md:text-xl font-extrabold truncate ${isSurplus ? 'text-primary' : 'text-expense'}`}>
              {isSurplus ? '+' : ''}{formatRupiah(summary.net_cash_flow)}
            </p>
          </div>
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
              isSurplus
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-expense/10 text-expense border-expense/20'
            }`}
          >
            <Scales size={20} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}
