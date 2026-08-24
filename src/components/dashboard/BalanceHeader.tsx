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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-[#1A7B57] to-[#125A3F] p-3.5 sm:p-5 md:p-6 text-white shadow-md shadow-primary/15 transition-all">
      {/* Decorative background glow */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3 sm:space-y-4">
        {/* Main Balance Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-white/80 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck size={15} weight="fill" className="text-emerald-200 shrink-0" />
              <span className="truncate">Total Saldo Kas Rumah Tangga</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight whitespace-nowrap tabular-nums">
                {showBalance ? formatRupiah(totalBalance) : '••••••••••••'}
              </h1>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="min-w-[34px] min-h-[34px] flex items-center justify-center p-1 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-white active:scale-95"
                aria-label={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
              >
                {showBalance ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <p className="text-[10px] sm:text-xs text-white/80">
              Terbagi dalam <span className="font-bold text-white">{walletCount} Pos Kas</span> aktif.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToDebts && (
              <button
                onClick={onNavigateToDebts}
                className="min-h-[38px] px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-all"
              >
                <HandCoins size={16} weight="duotone" />
                <span>Hutang-Piutang</span>
              </button>
            )}

            {onManageWallets && (
              <button
                onClick={onManageWallets}
                className="min-h-[38px] px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-all"
              >
                <Wallet size={16} weight="duotone" />
                <span>Kelola Pos Kas</span>
              </button>
            )}
          </div>
        </div>

        {/* Safe-to-Spend Liquidity Card */}
        <div className="p-2.5 sm:p-3 bg-black/20 backdrop-blur-md rounded-xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Sparkle size={14} weight="fill" className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/70 font-semibold leading-tight">
                Sisa Dana Bebas Belanja (Safe-to-Spend):
              </p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {showBalance ? formatRupiah(effectiveSafeToSpend) : '••••••••••••'}
                <span className="text-[10px] font-normal text-white/70 ml-1.5">
                  (setelah dikurangi {formatRupiah(pendingBillsAmount + payableDueAmount)} kewajiban tagihan & hutang)
                </span>
              </p>
            </div>
          </div>

          <span
            className={`self-start sm:self-center text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              isHealthy
                ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                : 'bg-red-400/20 text-red-200 border-red-400/30'
            }`}
          >
            {isHealthy ? 'Likuiditas Aman' : 'Kewajiban Melebihi Kas'}
          </span>
        </div>
      </div>
    </div>
  );
}
