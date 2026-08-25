'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CaretLeft,
  CaretRight,
  User,
  SignOut,
  Calendar,
  Gear,
  UserCircle,
  CaretDown,
} from '@phosphor-icons/react';
import { INDONESIAN_MONTHS } from '@/lib/formatters';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

import { NavTab } from './BottomNav';

interface TopHeaderProps {
  activeTab?: NavTab;
  currentMonth: number;
  currentYear: number;
  onPeriodChange: (month: number, year: number) => void;
  userName?: string;
  userEmail?: string;
  familyName?: string;
  onNavigateToSettings?: () => void;
  onLogout: () => void;
}

export function TopHeader({
  activeTab = 'dashboard',
  currentMonth,
  currentYear,
  onPeriodChange,
  userName = 'Pengguna',
  userEmail,
  familyName = 'Keluarga Bahagia',
  onNavigateToSettings,
  onLogout,
}: TopHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

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

  const handleOpenSettings = () => {
    setIsMenuOpen(false);
    if (onNavigateToSettings) {
      onNavigateToSettings();
    }
  };

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    onLogout();
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-2 sm:gap-4">
        {/* Context-aware Left Header: Period Selector on period-tabs, or Section Badge on non-period tabs */}
        {['assets', 'debts', 'wallets', 'settings'].includes(activeTab) ? (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs sm:text-sm font-extrabold text-text capitalize">
              {activeTab === 'assets'
                ? 'Aset & Depresiasi'
                : activeTab === 'debts'
                ? 'Hutang & Piutang'
                : activeTab === 'wallets'
                ? 'Pos Kas & Rekening'
                : 'Pengaturan & Backup'}
            </span>
          </div>
        ) : (
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
        )}

        {/* Right Corner Actions: Theme Toggle & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Buka menu profil dan pengaturan"
            className="flex items-center gap-2 p-1 sm:p-1.5 hover:bg-surface rounded-2xl border border-transparent hover:border-border transition-all active:scale-95 min-h-[40px]"
          >
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-text leading-tight">{userName}</span>
              <span className="text-[11px] text-text-muted leading-tight">{familyName}</span>
            </div>

            <div className="w-9 h-9 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <User size={18} weight="bold" />
            </div>

            <CaretDown
              size={12}
              weight="bold"
              className={`text-text-muted transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Profile Dropdown Sheet / Popover */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-2xl shadow-xl p-2.5 z-50 animate-scale-in origin-top-right space-y-2">
              {/* User Identity Header */}
              <div className="p-2.5 bg-surface-2 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text truncate">{userName}</p>
                    <p className="text-[10px] text-text-muted truncate">{familyName}</p>
                  </div>
                </div>
                {userEmail && (
                  <p className="text-[10px] text-text-muted truncate pt-1 border-t border-border/50">
                    {userEmail}
                  </p>
                )}
              </div>

              {/* Action Menu List */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text hover:bg-surface-2 rounded-xl transition-colors text-left"
                >
                  <Gear size={16} weight="duotone" className="text-primary" />
                  <span>Pengaturan & Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text hover:bg-surface-2 rounded-xl transition-colors text-left"
                >
                  <UserCircle size={16} weight="duotone" className="text-teal-600" />
                  <span>Edit Profil & Nama Kas</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-expense hover:bg-expense/10 rounded-xl transition-colors text-left"
                >
                  <SignOut size={16} weight="bold" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
