'use client';

import React, { useState } from 'react';
import { Eye, EyeSlash, ShieldCheck, Wallet, Sparkle, HandCoins } from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';

interface BalanceHeaderProps {
  totalBalance: number;
  walletCount: number;
  safeToSpend?: number;
  pendingBillsAmount?: number;
  payableDueAmount?: number;
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
  const isHealthy = effectiveSafeToSpend >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-[#1A7B57] to-[#125A3F] p-4 sm:p-5 md:p-6 text-white shadow-md shadow-primary/15 transition-all">
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
              <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight whitespace-nowrap tabular-nums ${totalBalance < 0 ? 'text-red-200' : 'text-white'}`}>
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

        {/* Safe-to-Spend Liquidity Sub-card */}
        <div className="p-2.5 sm:p-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkle size={13} weight="fill" className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/75 font-semibold leading-tight hidden sm:block">
                Dana Bebas Belanja & Uang Dingin Rencana:
              </p>
              <p className="text-[10px] text-white/75 font-semibold leading-tight sm:hidden">
                Dana Bebas & Uang Dingin:
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                {showBalance ? formatRupiah(effectiveSafeToSpend) : '••••••'}
                <span className="text-[9px] font-normal text-white/60 ml-1 hidden sm:inline">
                  (dikurangi kewajiban {formatRupiah(pendingBillsAmount + payableDueAmount)})
                </span>
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
      </div>
    </div>
  );
}
