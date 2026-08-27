'use client';

import React from 'react';
import {
  Snowflake,
  Sparkle,
  LockKey,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';
import { Wallet, Budget, ColdMoneyInfo } from '@/lib/types';

interface ColdMoneyCardProps {
  wallets: Wallet[];
  budgets: Budget[];
  totalExpense?: number;
  pendingBills?: number;
  payableDue?: number;
}

export function calculateColdMoney(
  wallets: Wallet[],
  budgets: Budget[],
  totalExpense: number = 0,
  pendingBills: number = 0,
  payableDue: number = 0
): ColdMoneyInfo {
  const total_liquid_cash = wallets.reduce((sum, w) => sum + Math.max(0, w.balance || 0), 0);
  
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const monthlyBudget = totalBudgetFromLimits > 0 ? totalBudgetFromLimits : totalExpense > 0 ? totalExpense : 1000000;
  
  // Total Cadangan Keamanan Wajib (4 Bulan Biaya + 10% Cadangan Risiko = 4.4x Anggaran)
  const safety_reserve_required = monthlyBudget * 4.4;
  
  // Kewajiban tertunda
  const pending_obligations = pendingBills + payableDue;
  
  // Uang Dingin Riil yang benar-benar bersih dan bebas dari seluruh alokasi wajib
  const cold_money = Math.max(0, total_liquid_cash - safety_reserve_required - pending_obligations);
  const is_available = cold_money > 0;

  const status_title = is_available
    ? 'Uang Dingin Tersedia (Bebas untuk Rencana Jangka Pendek)'
    : 'Belum Ada Uang Dingin (Kas Terfokus untuk Cadangan Wajib)';

  const recommendations: string[] = [];
  if (is_available) {
    recommendations.push(`Anda memiliki uang dingin sebesar ${formatRupiah(cold_money)} yang bebas digunakan untuk rencana apa saja tanpa mengancam ketahanan keluarga.`);
    recommendations.push('Dapat dialokasikan untuk investasi jangka pendek, liburan impian, upgrade peralatan, hobi, atau modal usaha baru.');
  } else {
    const gap = (safety_reserve_required + pending_obligations) - total_liquid_cash;
    recommendations.push(`Seluruh kas saat ini masih dialokasikan untuk mencukupi cadangan keamanan wajib 4.4x anggaran (${formatRupiah(safety_reserve_required)}) dan kewajiban tagihan.`);
    recommendations.push(`Kumpulkan tambahan kas sebesar ${formatRupiah(Math.max(0, gap))} lagi untuk mulai menghasilkan uang dingin bebas pakai.`);
  }

  return {
    total_liquid_cash,
    safety_reserve_required,
    pending_obligations,
    cold_money,
    is_available,
    status_title,
    recommendations,
  };
}

export function ColdMoneyCard({
  wallets,
  budgets,
  totalExpense = 0,
  pendingBills = 0,
  payableDue = 0,
}: ColdMoneyCardProps) {
  const info = calculateColdMoney(wallets, budgets, totalExpense, pendingBills, payableDue);

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xs ${
        info.is_available
          ? 'bg-blue-500/5 border-blue-500/25'
          : 'bg-surface border-border'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              info.is_available ? 'bg-blue-600 text-white' : 'bg-surface-2 text-text-muted border border-border'
            }`}
          >
            <Snowflake size={22} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-text">
                Uang Dingin & Dana Rencana Jangka Pendek
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  info.is_available
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : 'bg-surface-2 text-text-muted border-border'
                }`}
              >
                {info.is_available ? 'Siap Pakai' : 'Belum Tersedia'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Uang riil yang aman digunakan setelah seluruh cadangan 4.4x anggaran & tagihan terlindungi.
            </p>
          </div>
        </div>
      </div>

      {/* Grid 4 Kolom Alokasi Kas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3">
        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">1. Total Kas Riil</span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text tabular-nums whitespace-nowrap">
            {formatRupiah(info.total_liquid_cash)}
          </p>
          <span className="text-[10px] text-text-muted block">Seluruh rekening & kas</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">2. Cadangan 4.4x Anggaran</span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text tabular-nums whitespace-nowrap">
            {formatRupiah(info.safety_reserve_required)}
          </p>
          <span className="text-[10px] text-text-muted block">4 Bulan + 10% Risiko</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">3. Tagihan & Hutang</span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-expense tabular-nums whitespace-nowrap">
            {formatRupiah(info.pending_obligations)}
          </p>
          <span className="text-[10px] text-text-muted block">Kewajiban tertunda</span>
        </div>

        <div
          className={`p-3 rounded-2xl border space-y-1 ${
            info.is_available
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-surface-2 border-border'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-text-muted block">
            UANG DINGIN (BEBAS PAKAI)
          </span>
          <p
            className={`text-xs sm:text-sm md:text-base font-extrabold tabular-nums whitespace-nowrap ${
              info.is_available ? 'text-blue-600 dark:text-blue-400' : 'text-text-muted'
            }`}
          >
            {formatRupiah(info.cold_money)}
          </p>
          <span className="text-[10px] font-semibold text-text-muted block">
            {info.is_available ? 'Bebas untuk apa saja' : 'Fokuskan cadangan'}
          </span>
        </div>
      </div>

      {/* Guidance Insight Box */}
      <div
        className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          info.is_available
            ? 'bg-blue-500/10 border-blue-500/20 text-text'
            : 'bg-surface-2 border-border/70 text-text'
        }`}
      >
        {info.is_available ? (
          <Sparkle size={18} weight="fill" className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        ) : (
          <LockKey size={18} weight="fill" className="text-text-muted shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5 min-w-0">
          <p className="font-bold text-xs">{info.status_title}</p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            {info.recommendations.join(' ')}
          </p>
        </div>
      </div>
    </div>
  );
}
