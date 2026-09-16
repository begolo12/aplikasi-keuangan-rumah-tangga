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
  receivableDueAmount?: number;
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
  receivableDueAmount = 0,
  monthlyRecurringTotal = 0,
  onManageWallets,
  onNavigateToDebts,
}: BalanceHeaderProps) {
  const [showBalance, setShowBalance] = useState(true);
  // Rumus harus sama dengan API (dashboard/bootstrap & reports/monthly):
  // saldo kas - (tagihan pending + hutang jatuh tempo) + piutang yang akan masuk.
  const effectiveSafeToSpend =
    safeToSpend !== undefined
      ? safeToSpend
      : totalBalance - (pendingBillsAmount + payableDueAmount) + receivableDueAmount;
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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-hero via-primary-hero-2 to-primary-deep p-4 sm:p-5 md:p-6 text-white shadow-sm shadow-primary/10 transition-all">
      {/* Subtle decorative glow */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5 sm:space-y-4">
        {/* Main Balance Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="flex items-center gap-1.5 text-white/80 text-[11px] sm:text-xs font-bold tracking-wider uppercase">
              <ShieldCheck size={15} weight="fill" className="text-white shrink-0" aria-hidden="true" />
              <span className="truncate">Total Saldo Kas & Likuiditas</span>
            </h1>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <p className="font-display-num text-3xl sm:text-4xl md:text-[2.75rem] leading-tight whitespace-nowrap tabular-nums text-white">
                {showBalance ? formatRupiah(totalBalance) : '••••••••••••'}
              </p>
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
                className="min-h-[44px] px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-all shadow-2xs"
              >
                <HandCoins size={16} weight="duotone" />
                <span>Hutang-Piutang</span>
              </button>
            )}

            {onManageWallets && (
              <button
                onClick={onManageWallets}
                className="min-h-[44px] px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-all shadow-2xs"
              >
                <Wallet size={16} weight="duotone" />
                <span>Kelola Pos Kas</span>
              </button>
            )}
          </div>
        </div>

        {/* Safe-to-Spend Liquidity Sub-card & Daily Quota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 sm:p-3 bg-black/25 rounded-2xl border border-white/15 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Coins size={13} weight="fill" className="text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-white/85 font-semibold leading-tight">
                  Dana Bebas & Uang Dingin:
                </p>
                <p className="font-display-num text-base sm:text-lg text-white truncate tabular-nums">
                  {showBalance ? formatRupiah(effectiveSafeToSpend) : '••••••'}
                </p>
              </div>
            </div>

            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-xl border shrink-0 ${
                isHealthy
                  ? 'bg-white/15 text-white border-white/25'
                  : 'bg-warning/25 text-white border-warning/40'
              }`}
            >
              {isHealthy ? 'Siap Pakai' : 'Defisit Kas'}
            </span>
          </div>

          {/* Kuota Belanja Harian (Daily Safe-to-Spend) */}
          <div className="p-2.5 sm:p-3 bg-black/25 rounded-2xl border border-white/15 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <CalendarCheck size={13} weight="fill" className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-white/85 font-semibold leading-tight">
                  Batas Belanja Harian ({dailyQuota.daysRemaining} hari sisa):
                </p>
                <p className="font-display-num text-base sm:text-lg text-white truncate tabular-nums">
                  {showBalance ? `${formatCompactRupiah(dailyQuota.amountPerDay)} / hr` : '••••••'}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2 py-0.5 rounded-xl border border-white/20 bg-white/10 text-white/90 shrink-0">
              Maksimal
            </span>
          </div>
        </div>

        {monthlyRecurringTotal > 0 && (
          <div className="p-2 sm:p-2.5 bg-black/25 rounded-2xl border border-white/15 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <CalendarCheck size={13} weight="fill" className="text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-white/85 font-semibold leading-tight">
                  Total Langganan Rutin:
                </p>
                <p className="font-display-num text-xs sm:text-sm font-bold text-white tabular-nums truncate">
                  {showBalance ? formatRupiah(Math.round(monthlyRecurringTotal)) : '••••••'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-xl bg-warning text-warning-fg whitespace-nowrap">
              Fixed Cost
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
