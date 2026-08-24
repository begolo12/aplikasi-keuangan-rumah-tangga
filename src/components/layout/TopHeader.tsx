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
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-2 sm:gap-4">
        {/* Month / Year Period Selector */}
        <div className="flex items-center gap-1 bg-surface border border-border px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-xs">
          <Calendar size={16} className="text-primary mr-0.5 sm:mr-1 shrink-0" weight="duotone" />
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            title="Bulan Sebelumnya"
            className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-text min-w-[96px] sm:min-w-[110px] text-center select-none truncate">
            {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            title="Bulan Berikutnya"
            className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors"
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
            type="button"
            onClick={onLogout}
            aria-label="Keluar dari aplikasi"
            title="Keluar"
            className="hidden md:flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl border border-transparent hover:border-expense/20 transition-all"
          >
            <SignOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
