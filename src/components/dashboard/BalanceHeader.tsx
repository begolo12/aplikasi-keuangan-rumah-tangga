'use client';

import React, { useState, useMemo } from 'react';
import { Eye, EyeSlash, ShieldCheck, Wallet, Coins, HandCoins, CalendarCheck } from '@phosphor-icons/react';
import { formatRupiah, formatCompactRupiah } from '@/lib/formatters';

interface BalanceHeaderProps {
  totalBalance: number;
  walletCount: number;
  safeToSpend?: number;
  pendingBillsAmount?: number;
  payableDueAmount?: number;
  monthlyRecurringTotal?: number;
  onManageWallets?: () => void;
  onNavigateToDebts?: () => void;
}

export function BalanceHeader({
  totalBalance,
  walletCount,
  safeToSpend,
  pendingBillsAmount = 0,
  payableDueAmount = 0,
  onManageWallets,
  onNavigateToDebts,
}: BalanceHeaderProps) {
  const [showBalance, setShowBalance] = useState(true);
  const effectiveSafeToSpend = safeToSpend !== undefined ? safeToSpend : totalBalance - (pendingBillsAmount + payableDueAmount);
{/* Monthly Recurring Indicator */}
        {monthlyRecurringTotal > 0 && (
          <div className="p-2 sm:p-2.5 bg-warning/10 backdrop-blur-md rounded-xl border border-warning/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
                <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor" className="text-warning">
                  <path d="M8 2a1 1 0 0 1 1 1v4h3a1 1 0 1 1 0 2H9V4a1 1 0 0 1-1-1V2z"/>
                  <path d="M13 7a1 1 0 0 1-1-1V4a1 1 0 0 0-1-1H9a1 1 0 1 0 0 2h1v2H8V5H7v4h1v2H7v2h1v2a1 1 0 1 0 2 0v-2h1V9a1 1 0 1 0-2 0v2H7a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-1V8h1a1 1 0 0 0 1-1z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted font-semibold leading-tight truncate">
                  Langganan Bulanan:
                </p>
                <p className="font-display-num text-xs sm:text-sm font-bold text-warning tabular-nums truncate">
                  Rp{Math.round(monthlyRecurringTotal).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-warning/20 text-warning border border-warning/30 whitespace-nowrap">
              Fixed Cost
            </span>
          </div>
        )}
  const isHealthy = effectiveSafeToSpend >= 0;

  // Hitung sisa hari bulan ini untuk kuota belanja harian
  const dailyQuota = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, lastDayOfMonth - now.getDate() + 1);
    const amountPerDay = effectiveSafeToSpend > 0 ? Math.floor(effectiveSafeToSpend / daysRemaining) : 0;
    return {
      daysRemaining,
      amountPerDay,
    };
  }, [effectiveSafeToSpend]);
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-primary-hover to-primary-deep p-4 sm:p-5 md:p-6 text-white shadow-md shadow-primary/15 transition-all">
      {/* Subtle decorative glow */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5 sm:space-y-4">
        {/* Main Balance Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-white/80 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
              <ShieldCheck size={15} weight="fill" className="text-emerald-200 shrink-0" />
              <span className="truncate">Total Saldo Kas & Likuiditas</span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className={`font-display-num text-3xl sm:text-4xl md:text-[2.75rem] leading-tight whitespace-nowrap tabular-nums ${totalBalance < 0 ? 'text-red-100' : 'text-white'}`}>
                {showBalance ? formatRupiah(totalBalance) : '••••••••••••'}
              </h1>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="w-8 h-8 flex items-center justify-center p-1 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-white active:scale-95 shrink-0 shadow-2xs"
                aria-label={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
              >
                {showBalance ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-white/80">
              Terdistribusi dalam <span className="font-bold text-white">{walletCount} Pos Kas & Rekening</span>.
            </p>
          </div>

          {/* Quick Action Navigation Links — Desktop only */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {onNavigateToDebts && (
              <button
                onClick={onNavigateToDebts}
                className="min-h-[36px] px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-all shadow-2xs"
              >
                <HandCoins size={16} weight="duotone" />
                <span>Hutang-Piutang</span>
              </button>
            )}

            {onManageWallets && (
              <button
                onClick={onManageWallets}
                className="min-h-[36px] px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-all shadow-2xs"
              >
                <Wallet size={16} weight="duotone" />
                <span>Kelola Pos Kas</span>
              </button>
            )}
          </div>
        </div>

        {/* Safe-to-Spend Liquidity Sub-card & Daily Quota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 sm:p-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Coins size={13} weight="fill" className="text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-white/75 font-semibold leading-tight">
                  Dana Bebas & Uang Dingin:
                </p>
                <p className="font-display-num text-base sm:text-lg text-white truncate tabular-nums">
                  {showBalance ? formatRupiah(effectiveSafeToSpend) : '••••••'}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-xl border shrink-0 ${
                isHealthy
                  ? 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30'
                  : 'bg-red-400/20 text-red-100 border-red-400/30'
              }`}
            >
              {isHealthy ? 'Siap Pakai' : 'Defisit Kas'}
            </span>
          </div>

          {/* Kuota Belanja Harian (Daily Safe-to-Spend) */}
          <div className="p-2.5 sm:p-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <CalendarCheck size={13} weight="fill" className="text-emerald-200" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-white/75 font-semibold leading-tight">
                  Batas Belanja Harian ({dailyQuota.daysRemaining} hari sisa):
                </p>
                <p className="font-display-num text-base sm:text-lg text-white truncate tabular-nums">
                  {showBalance ? `${formatCompactRupiah(dailyQuota.amountPerDay)} / hr` : '••••••'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-xl border border-white/20 bg-white/10 text-white/90 shrink-0">
              Maksimal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
