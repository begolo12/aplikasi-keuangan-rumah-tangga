'use client';

import React from 'react';
import {
  ShieldCheck,
  ShieldWarning,
  LockKeyOpen,
  LockKey,
  Sparkle,
  WarningCircle,
  Vault,
  ArrowsClockwise,
  CheckCircle,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';
import { Budget, Wallet, FinancialSafetyPlan } from '@/lib/types';

interface FinancialSafetyPlanCardProps {
  budgets: Budget[];
  wallets: Wallet[];
  totalExpense?: number;
  onNavigateToWallets?: () => void;
}

export function calculateFinancialSafetyPlan(
  budgets: Budget[],
  wallets: Wallet[],
  totalExpense: number = 0
): FinancialSafetyPlan {
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const monthly_budget = totalBudgetFromLimits > 0 ? totalBudgetFromLimits : totalExpense > 0 ? totalExpense : 1000000;

  // Cadangan Biaya 4 Bulan
  const reserve_4_months = monthly_budget * 4;
  
  // Cadangan Risiko 10% (10% dari cadangan 4 bulan = 0.4x anggaran)
  const risk_buffer_10_pct = reserve_4_months * 0.1;

  // Total Syarat Minimal Uang yang Wajib Dimiliki (4.4x Anggaran)
  const total_min_required = reserve_4_months + risk_buffer_10_pct;

  // Saldo Kas/Tabungan Riil Saat Ini
  const savingsWallets = wallets.filter((w) => w.type === 'savings');
  const totalSavings = savingsWallets.reduce((s, w) => s + (w.balance || 0), 0);
  const totalLiquid = wallets.reduce((s, w) => s + Math.max(0, w.balance || 0), 0);
  const current_cash = savingsWallets.length > 0 ? Math.max(0, totalSavings) : totalLiquid;

  const gap_needed = Math.max(0, total_min_required - current_cash);
  const progress_pct = total_min_required > 0 ? Math.min(100, Math.round((current_cash / total_min_required) * 100)) : 0;
  const can_expand_expense = current_cash >= total_min_required;

  return {
    monthly_budget,
    reserve_4_months,
    risk_buffer_10_pct,
    total_min_required,
    current_cash,
    gap_needed,
    progress_pct,
    can_expand_expense,
  };
}

export function FinancialSafetyPlanCard({
  budgets,
  wallets,
  totalExpense = 0,
  onNavigateToWallets,
}: FinancialSafetyPlanCardProps) {
  const plan = calculateFinancialSafetyPlan(budgets, wallets, totalExpense);

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-2xs ${
        plan.can_expand_expense
          ? 'bg-primary/5 border-primary/30'
          : 'bg-expense/5 border-expense/25'
      }`}
    >
      {/* Header Resume Rencana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              plan.can_expand_expense ? 'bg-primary text-white' : 'bg-expense text-white'
            }`}
          >
            {plan.can_expand_expense ? (
              <LockKeyOpen size={22} weight="fill" />
            ) : (
              <LockKey size={22} weight="fill" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-text">
                Resume Rencana Keamanan & Cadangan Risiko
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  plan.can_expand_expense
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-expense/10 text-expense border-expense/30 animate-pulse'
                }`}
              >
                {plan.can_expand_expense
                  ? 'Syarat Terpenuhi: Boleh Tambah Pengeluaran'
                  : 'Terkunci: Wajib Punya Cadangan Dulu'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Aturan KPI: Cadangan 4 Bulan + Cadangan Risiko 10% (Total: {formatRupiah(plan.total_min_required)})
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
            <span>Pos Tabungan & Kas</span>
          </button>
        )}
      </div>

      {/* Grid Rincian 4 Kolom */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3.5">
        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">
            1. Cadangan 4 Bulan
          </span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
            {formatRupiah(plan.reserve_4_months)}
          </p>
          <span className="text-[10px] text-text-muted block">4x Anggaran Belanja</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">
            2. Cadangan Risiko (10%)
          </span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
            {formatRupiah(plan.risk_buffer_10_pct)}
          </p>
          <span className="text-[10px] text-text-muted block">Buffer Ketidakpastian</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">
            Total Syarat Minimal
          </span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text whitespace-nowrap tabular-nums">
            {formatRupiah(plan.total_min_required)}
          </p>
          <span className="text-[10px] text-text-muted block">Wajib Dimiliki Dulu</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted block">
            Uang Cadangan Saat Ini
          </span>
          <p
            className={`text-xs sm:text-sm md:text-base font-extrabold whitespace-nowrap tabular-nums ${
              plan.can_expand_expense ? 'text-primary' : 'text-expense'
            }`}
          >
            {formatRupiah(plan.current_cash)}
          </p>
          <span className="text-[10px] text-text-muted block">
            {plan.can_expand_expense ? 'Target Tercapai' : `Kurang ${formatRupiah(plan.gap_needed)}`}
          </span>
        </div>
      </div>

      {/* Progress Bar & Status */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-muted">Progres Akumulasi Dana Cadangan</span>
          <span
            className={`font-extrabold tabular-nums ${
              plan.can_expand_expense ? 'text-primary' : 'text-expense'
            }`}
          >
            {plan.progress_pct}% dari {formatRupiah(plan.total_min_required)}
          </span>
        </div>

        <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              plan.can_expand_expense ? 'bg-primary' : plan.progress_pct > 60 ? 'bg-amber-500' : 'bg-expense'
            }`}
            style={{ width: `${Math.min(100, Math.max(3, plan.progress_pct))}%` }}
          />
        </div>
      </div>

      {/* KPI Policy Guidance Box */}
      <div
        className={`mt-3.5 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          plan.can_expand_expense
            ? 'bg-primary/10 border-primary/20 text-text'
            : 'bg-expense/10 border-expense/20 text-text'
        }`}
      >
        {plan.can_expand_expense ? (
          <CheckCircle size={20} weight="fill" className="text-primary shrink-0 mt-0.5" />
        ) : (
          <WarningCircle size={20} weight="fill" className="text-expense shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 min-w-0">
          <p className="font-bold text-xs">
            {plan.can_expand_expense
              ? 'Aturan KPI Terpenuhi: Keuangan Sangat Aman'
              : 'Aturan KPI Belum Terpenuhi: Dilarang / Tidak Disarankan Menambah Pos Pengeluaran Baru'}
          </p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            {plan.can_expand_expense
              ? `Anda telah memiliki uang cadangan sebesar ${formatRupiah(plan.current_cash)}, melebihi batas syarat minimal ${formatRupiah(plan.total_min_required)} (Cadangan 4 Bulan ${formatRupiah(plan.reserve_4_months)} + Risiko 10% ${formatRupiah(plan.risk_buffer_10_pct)}). Anda memiliki ruang yang aman jika ingin menetapkan pos anggaran atau pengeluaran baru.`
              : `Sesuai aturan KPI keuangan keluarga, Anda wajib memiliki minimal uang cadangan sebesar ${formatRupiah(plan.total_min_required)} (Cadangan 4 Bulan ${formatRupiah(plan.reserve_4_months)} + Cadangan Risiko 10% ${formatRupiah(plan.risk_buffer_10_pct)}) sebelum menambah pos pengeluaran atau menaikkan gaya hidup. Saat ini masih kurang ${formatRupiah(plan.gap_needed)}. Fokuskan dana surplus untuk memenuhi cadangan ini terlebih dahulu.`}
          </p>
        </div>
      </div>
    </div>
  );
}
