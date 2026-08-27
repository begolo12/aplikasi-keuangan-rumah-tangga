'use client';

import React from 'react';
import { ShieldCheck, ShieldWarning, Vault, ArrowRight, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';
import { Budget, Wallet } from '@/lib/types';

interface EmergencyFundCardProps {
  budgets: Budget[];
  wallets: Wallet[];
  totalExpense?: number;
  onNavigateToWallets?: () => void;
}

export function EmergencyFundCard({
  budgets,
  wallets,
  totalExpense = 0,
  onNavigateToWallets,
}: EmergencyFundCardProps) {
  // 1. Total Anggaran Bulanan (atau fallback ke realisasi pengeluaran)
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const baselineMonthly = totalBudgetFromLimits > 0 ? totalBudgetFromLimits : totalExpense > 0 ? totalExpense : 1000000;

  // 2. Target Dana Darurat: Wajib 4x dari Anggaran
  const MULTIPLIER = 4;
  const targetEmergencyFund = baselineMonthly * MULTIPLIER;

  // 3. Saldo Dana Darurat Terkumpul (Dompet type savings, atau seluruh kas jika tidak ada dompet tabungan)
  const savingsWallets = wallets.filter((w) => w.type === 'savings');
  const savingsAmount = savingsWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalLiquidCash = wallets.reduce((sum, w) => sum + Math.max(0, w.balance || 0), 0);
  
  // Jika punya dompet tabungan/dana darurat khusus gunakan savingsAmount, jika tidak gunakan total kas
  const currentEmergencyFund = savingsWallets.length > 0 ? Math.max(0, savingsAmount) : totalLiquidCash;

  // 4. Perhitungan KPI
  const progressPct = targetEmergencyFund > 0 ? Math.min(100, Math.round((currentEmergencyFund / targetEmergencyFund) * 100)) : 0;
  const remainingNeeded = Math.max(0, targetEmergencyFund - currentEmergencyFund);
  const isSafe = currentEmergencyFund >= targetEmergencyFund;
  const monthsCovered = Math.round((currentEmergencyFund / baselineMonthly) * 10) / 10;

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-2xs ${
        isSafe
          ? 'bg-primary/5 border-primary/30'
          : 'bg-expense/5 border-expense/25'
      }`}
    >
      {/* Header KPI Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isSafe ? 'bg-primary text-white' : 'bg-expense text-white'
            }`}
          >
            {isSafe ? <ShieldCheck size={22} weight="fill" /> : <ShieldWarning size={22} weight="fill" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-text">Dana Darurat (Aturan 4x Anggaran)</h3>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isSafe
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-expense/10 text-expense border-expense/30 animate-pulse'
                }`}
              >
                {isSafe ? 'Keuangan Aman' : 'Keuangan Belum Aman'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              {totalBudgetFromLimits > 0
                ? `Berdasarkan total batas anggaran bulanan: ${formatRupiah(totalBudgetFromLimits)}`
                : `Berdasarkan estimasi pengeluaran bulanan: ${formatRupiah(baselineMonthly)}`}
            </p>
          </div>
        </div>

        {onNavigateToWallets && (
          <button
            type="button"
            onClick={onNavigateToWallets}
            className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[36px]"
          >
            <Vault size={16} weight="bold" />
            <span>Kelola Dompet / Tabungan</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Grid Angka & Target */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3.5">
        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">Target (4x Anggaran)</span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
            {formatRupiah(targetEmergencyFund)}
          </p>
          <span className="text-[10px] text-text-muted block">4 bulan pengeluaran</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">Dana Darurat Terkumpul</span>
          <p
            className={`text-xs sm:text-sm md:text-base font-extrabold whitespace-nowrap tabular-nums ${
              isSafe ? 'text-primary' : 'text-expense'
            }`}
          >
            {formatRupiah(currentEmergencyFund)}
          </p>
          <span className="text-[10px] text-text-muted block">Setara {monthsCovered} bulan</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">Status Kekurangan</span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
            {isSafe ? 'Rp 0 (Tercapai)' : formatRupiah(remainingNeeded)}
          </p>
          <span className="text-[10px] text-text-muted block">
            {isSafe ? 'Target terpenuhi' : 'Harus dikumpulkan'}
          </span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">Progres KPI</span>
          <p
            className={`text-xs sm:text-sm md:text-base font-extrabold tabular-nums ${
              isSafe ? 'text-primary' : 'text-expense'
            }`}
          >
            {progressPct}%
          </p>
          <span className="text-[10px] text-text-muted block">Minimal 100%</span>
        </div>
      </div>

      {/* Progress Bar & Status Text */}
      <div className="space-y-1.5 pt-1">
        <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isSafe ? 'bg-primary' : progressPct > 50 ? 'bg-warning' : 'bg-expense'
            }`}
            style={{ width: `${Math.min(100, Math.max(3, progressPct))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>0x (0%)</span>
          <span className="font-bold">2x (50%)</span>
          <span className={`font-bold ${isSafe ? 'text-primary' : 'text-expense'}`}>
            Target 4x (100%)
          </span>
        </div>
      </div>

      {/* Insight Alert Box */}
      <div
        className={`mt-3.5 p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
          isSafe
            ? 'bg-primary/10 border-primary/20 text-text'
            : 'bg-expense/10 border-expense/20 text-text'
        }`}
      >
        {isSafe ? (
          <Sparkle size={18} weight="fill" className="text-primary shrink-0 mt-0.5" />
        ) : (
          <WarningCircle size={18} weight="fill" className="text-expense shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5 min-w-0">
          <p className="font-bold text-xs">
            {isSafe
              ? 'Selamat! Kondisi Keuangan Anda Sudah Aman'
              : 'Peringatan KPI: Keuangan Anda Belum Aman'}
          </p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            {isSafe
              ? `Cadangan dana darurat Anda telah mencapai ${formatRupiah(currentEmergencyFund)} (lebih dari 4x anggaran bulanan ${formatRupiah(baselineMonthly)}). Keluarga Anda terlindungi jika terjadi pengeluaran darurat tak terduga.`
              : `Aturan KPI keuangan keluarga mensyaratkan dana darurat minimal 4x dari anggaran belanja (${formatRupiah(targetEmergencyFund)}). Saat ini baru terkumpul ${formatRupiah(currentEmergencyFund)} (${progressPct}%). Anda masih perlu menabung ${formatRupiah(remainingNeeded)} lagi.`}
          </p>
        </div>
      </div>
    </div>
  );
}
