'use client';

import React from 'react';
import { CaretLeft, CaretRight, User, SignOut, Calendar } from '@phosphor-icons/react';
import { INDONESIAN_MONTHS } from '@/lib/formatters';

interface TopHeaderProps {
  currentMonth: number;
  currentYear: number;
  onPeriodChange: (month: number, year: number) => void;
  userName?: string;
  familyName?: string;
  onLogout: () => void;
}

export function TopHeader({
  currentMonth,
  currentYear,
  onPeriodChange,
  userName = 'Pengguna',
  familyName = 'Keluarga Bahagia',
  onLogout,
}: TopHeaderProps) {
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onPeriodChange(12, currentYear - 1);
    } else {
      onPeriodChange(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onPeriodChange(1, currentYear + 1);
    } else {
      onPeriodChange(currentMonth + 1, currentYear);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        {/* Month / Year Period Selector */}
        <div className="flex items-center gap-1.5 bg-surface border border-border px-3 py-1.5 rounded-2xl shadow-sm">
          <Calendar size={18} className="text-primary mr-1 shrink-0" weight="duotone" />
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors"
            title="Bulan Sebelumnya"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="text-xs md:text-sm font-bold text-text min-w-[110px] text-center select-none">
            {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors"
            title="Bulan Berikutnya"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-bold text-text leading-tight">{userName}</span>
            <span className="text-[11px] text-text-muted leading-tight">{familyName}</span>
          </div>

          <div className="w-9 h-9 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
            <User size={18} weight="bold" />
          </div>

          <button
            onClick={onLogout}
            title="Keluar"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl border border-transparent hover:border-expense/20 transition-all"
          >
            <SignOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
