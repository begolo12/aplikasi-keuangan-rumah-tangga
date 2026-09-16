'use client';

import React from 'react';
import {
  LockKeyOpen,
  LockKey,
  WarningCircle,
  Vault,
  CheckCircle,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';
import { Budget, Wallet, FinancialSafetyPlan, RecurringBill, Debt } from '@/lib/types';
import { totalLiquidCash } from '@/lib/money';
import { ProgressBar } from '../ui/ProgressBar';
import { StatCard, StatGrid } from '../ui/StatCard';

interface FinancialSafetyPlanCardProps {
  budgets: Budget[];
  wallets: Wallet[];
  totalExpense?: number;
  bills?: RecurringBill[];
  debts?: Debt[];
  onNavigateToWallets?: () => void;
}

export function calculateFinancialSafetyPlan(
  budgets: Budget[],
  wallets: Wallet[],
  totalExpense: number = 0,
  bills: RecurringBill[] = [],
  debts: Debt[] = []
): FinancialSafetyPlan {
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  // Tagihan rutin aktif (pengeluaran) + cicilan hutang aktif — kewajiban bulanan pasti
  const activeBillsTotal = bills.filter((b) => b.is_active && (b.type ?? 'expense') === 'expense').reduce((sum, b) => sum + (b.amount || 0), 0);
  const activeDebtInstallments = debts
    .filter((d) => d.type === 'payable' && d.status !== 'paid' && (d.monthly_installment || 0) > 0)
    .reduce((sum, d) => sum + (d.monthly_installment || 0), 0);
  const fixedObligations = activeBillsTotal + activeDebtInstallments;
  const combinedBudget = totalBudgetFromLimits + fixedObligations;
  // is_default hanya true bila semua sumber 0 (manual + tagihan + cicilan + realisasi)
  const is_default_budget = combinedBudget <= 0 && totalExpense <= 0;
  // Tanpa fallback asumsi: bila semua 0 tampilkan 0. Jika ada tagihan/cicilan, mereka otomatis jadi anggaran.
  const monthly_budget = combinedBudget > 0 ? combinedBudget : totalExpense;

  // Cadangan Biaya 4 Bulan
  const reserve_4_months = monthly_budget * 4;
  
  // Cadangan Risiko 10% (10% dari cadangan 4 bulan = 0.4x anggaran)
  const risk_buffer_10_pct = reserve_4_months * 0.1;

  // Total Syarat Minimal Uang yang Wajib Dimiliki (4.4x Anggaran)
  const total_min_required = reserve_4_months + risk_buffer_10_pct;

  // Saldo Kas/Tabungan Riil Saat Ini: seluruh kas likuid dari semua tipe dompet
  // (konsisten dengan calculateColdMoney & kartu Dana Bebas di dashboard).
  const current_cash = totalLiquidCash(wallets);

  const gap_needed = Math.max(0, total_min_required - current_cash);
  const progress_pct = total_min_required > 0 ? Math.min(100, Math.round((current_cash / total_min_required) * 100)) : 0;
  const can_expand_expense = current_cash >= total_min_required;
  const cold_money_amount = Math.max(0, current_cash - total_min_required);

  return {
    monthly_budget,
    is_default_budget,
    reserve_4_months,
    risk_buffer_10_pct,
    total_min_required,
    current_cash,
    gap_needed,
    progress_pct,
    can_expand_expense,
    cold_money_amount,
  };
}

export function FinancialSafetyPlanCard({
  budgets,
  wallets,
  totalExpense = 0,
  bills = [],
  debts = [],
  onNavigateToWallets,
}: FinancialSafetyPlanCardProps) {
  const plan = calculateFinancialSafetyPlan(budgets, wallets, totalExpense, bills, debts);
  const showNeutral = plan.is_default_budget;

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-2xs ${
        showNeutral
          ? 'bg-surface border-border'
          : plan.can_expand_expense
          ? 'bg-primary/5 border-primary/30'
          : 'bg-expense/5 border-expense/25'
      }`}
    >
      {/* Header Resume Rencana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              showNeutral
                ? 'bg-surface-3 text-text'
                : plan.can_expand_expense
                ? 'bg-primary text-primary-fg'
                : 'bg-expense text-expense-fg'
            }`}
          >
            {showNeutral ? (
              <Vault size={22} weight="duotone" />
            ) : plan.can_expand_expense ? (
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
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  showNeutral
                    ? 'bg-surface-2 text-text-muted border-border'
                    : plan.can_expand_expense
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-expense/10 text-expense border-expense/30'
                }`}
              >
                {showNeutral
                  ? 'Anggaran Belum Diatur'
                  : plan.can_expand_expense
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
            className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <Vault size={16} weight="bold" />
            <span>Pos Tabungan & Kas</span>
          </button>
        )}
      </div>

      {/* Grid Rincian 4 Kolom */}
      <StatGrid layout="2-4" className="py-3.5">
        <StatCard
          size="compact"
          label="1. Cadangan 4 Bulan"
          value={formatRupiah(plan.reserve_4_months)}
          hint="4x Anggaran Belanja"
        />

        <StatCard
          size="compact"
          label="2. Cadangan Risiko (10%)"
          value={formatRupiah(plan.risk_buffer_10_pct)}
          hint="Buffer Ketidakpastian"
        />

        <StatCard
          size="compact"
          label="Total Syarat Minimal"
          value={formatRupiah(plan.total_min_required)}
          hint="Wajib Dimiliki Dulu"
        />

        <StatCard
          size="compact"
          label="Uang Cadangan Saat Ini"
          value={formatRupiah(plan.current_cash)}
          tone={showNeutral ? 'muted' : plan.can_expand_expense ? 'primary' : 'expense'}
          hint={
            showNeutral
              ? 'Menunggu Anggaran'
              : plan.can_expand_expense
              ? 'Target Tercapai'
              : `Kurang ${formatRupiah(plan.gap_needed)}`
          }
        />
      </StatGrid>

      {/* Progress Bar & Status */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-muted">Progres Akumulasi Dana Cadangan</span>
          <span
            className={`font-extrabold tabular-nums ${
              showNeutral
                ? 'text-text-muted'
                : plan.can_expand_expense
                ? 'text-primary'
                : 'text-expense'
            }`}
          >
            {plan.progress_pct}% dari {formatRupiah(plan.total_min_required)}
          </span>
        </div>

        <ProgressBar
          value={Math.min(100, Math.max(3, plan.progress_pct))}
          size="lg"
          barClassName={
            showNeutral
              ? 'bg-surface-3'
              : plan.can_expand_expense
              ? 'bg-primary'
              : plan.progress_pct > 60
              ? 'bg-warning'
              : 'bg-expense'
          }
          ariaLabel={`Progres dana cadangan ${plan.progress_pct} persen`}
        />
      </div>

      {/* KPI Policy Guidance Box */}
      <div
        className={`mt-3.5 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          showNeutral
            ? 'bg-surface-2 border-border text-text'
            : plan.can_expand_expense
            ? 'bg-primary/10 border-primary/20 text-text'
            : 'bg-expense/10 border-expense/20 text-text'
        }`}
      >
        {showNeutral ? (
          <Vault size={20} weight="duotone" className="text-text-muted shrink-0 mt-0.5" />
        ) : plan.can_expand_expense ? (
          <CheckCircle size={20} weight="fill" className="text-primary shrink-0 mt-0.5" />
        ) : (
          <WarningCircle size={20} weight="fill" className="text-expense shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 min-w-0">
          <p className="font-bold text-xs">
            {showNeutral
              ? 'Belum Ada Anggaran Bulanan: KPI Cadangan Belum Dihitung'
              : plan.can_expand_expense
              ? 'Aturan KPI Terpenuhi: Keuangan Sangat Aman'
              : 'Aturan KPI Belum Terpenuhi: Dilarang / Tidak Disarankan Menambah Pos Pengeluaran Baru'}
          </p>
          <p className="text-[11px] text-text-muted leading-relaxed">
            {showNeutral
              ? 'Semua angka di atas 0 karena Anda belum menetapkan anggaran bulanan dan belum ada pengeluaran tercatat. Begitu Anda menetapkan anggaran, KPI cadangan (4 bulan + risiko 10%) akan dihitung otomatis dari rencana belanja Anda yang sebenarnya.'
              : plan.can_expand_expense
              ? `Anda telah memiliki uang cadangan sebesar ${formatRupiah(plan.current_cash)}, melebihi batas syarat minimal ${formatRupiah(plan.total_min_required)} (Cadangan 4 Bulan ${formatRupiah(plan.reserve_4_months)} + Risiko 10% ${formatRupiah(plan.risk_buffer_10_pct)}). Anda memiliki ruang yang aman jika ingin menetapkan pos anggaran atau pengeluaran baru.`
              : `Sesuai aturan KPI keuangan keluarga, Anda wajib memiliki minimal uang cadangan sebesar ${formatRupiah(plan.total_min_required)} (Cadangan 4 Bulan ${formatRupiah(plan.reserve_4_months)} + Cadangan Risiko 10% ${formatRupiah(plan.risk_buffer_10_pct)}) sebelum menambah pos pengeluaran atau menaikkan gaya hidup. Saat ini masih kurang ${formatRupiah(plan.gap_needed)}. Fokuskan dana surplus untuk memenuhi cadangan ini terlebih dahulu.`}
          </p>
        </div>
      </div>
    </div>
  );
}
