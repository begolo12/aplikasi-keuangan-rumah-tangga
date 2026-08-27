'use client';

import React, { useState } from 'react';
import {
  ChartLineUp,
  TrendDown,
  TrendUp,
  Sparkle,
  PencilSimple,
  CheckCircle,
  WarningCircle,
  CaretRight,
} from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { Budget, ExpenseProjection } from '@/lib/types';
import { AmountInput } from '../ui/AmountInput';

interface ExpenseProjectionCardProps {
  budgets: Budget[];
  totalExpense: number;
  currentMonth: number;
  currentYear: number;
}

export function calculateExpenseProjection(
  budgets: Budget[],
  totalExpense: number,
  currentMonth: number,
  currentYear: number,
  customRemaining?: number
): ExpenseProjection {
  const totalBudget = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const planned_budget = totalBudget > 0 ? totalBudget : totalExpense > 0 ? totalExpense : 1500000;
  const current_spent = totalExpense;

  const now = new Date();
  const isCurrentMonth = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();
  const days_in_month = new Date(currentYear, currentMonth, 0).getDate();
  const days_passed = isCurrentMonth ? Math.min(days_in_month, Math.max(1, now.getDate())) : days_in_month;

  const burn_rate_daily = days_passed > 0 ? Math.round(current_spent / days_passed) : 0;
  const days_left = Math.max(0, days_in_month - days_passed);

  // Jika user tidak memberikan custom sisa estimasi, default gunakan sisa anggaran yang disesuaikan run-rate
  const autoRemainingEstimate =
    days_left > 0
      ? Math.round((planned_budget - current_spent) > 0 ? (planned_budget - current_spent) * (days_left / days_in_month) : 0)
      : 0;

  const remaining_estimated = customRemaining !== undefined ? customRemaining : autoRemainingEstimate;
  const projected_total = current_spent + remaining_estimated;
  const projected_savings = planned_budget - projected_total;
  const savings_percentage = planned_budget > 0 ? Math.round((projected_savings / planned_budget) * 100) : 0;

  return {
    planned_budget,
    current_spent,
    remaining_estimated,
    projected_total,
    projected_savings,
    savings_percentage,
    days_passed,
    days_in_month,
    burn_rate_daily,
  };
}

export function ExpenseProjectionCard({
  budgets,
  totalExpense,
  currentMonth,
  currentYear,
}: ExpenseProjectionCardProps) {
  const [customRemaining, setCustomRemaining] = useState<number | null>(null);
  const [isEditingRemaining, setIsEditingRemaining] = useState(false);
  const [tempRemaining, setTempRemaining] = useState(0);

  const projection = calculateExpenseProjection(
    budgets,
    totalExpense,
    currentMonth,
    currentYear,
    customRemaining !== null ? customRemaining : undefined
  );

  const handleOpenEdit = () => {
    setTempRemaining(projection.remaining_estimated);
    setIsEditingRemaining(true);
  };

  const handleSaveRemaining = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomRemaining(Math.max(0, tempRemaining));
    setIsEditingRemaining(false);
  };

  const handleResetToAuto = () => {
    setCustomRemaining(null);
    setIsEditingRemaining(false);
  };

  const isSaving = projection.projected_savings >= 0;

  return (
    <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl shrink-0 ${isSaving ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
            <ChartLineUp size={20} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-text">
                Proyeksi Pengeluaran ({INDONESIAN_MONTHS[currentMonth - 1]} {currentYear})
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  isSaving
                    ? 'bg-income/10 text-income border-income/20'
                    : 'bg-expense/10 text-expense border-expense/20 animate-pulse'
                }`}
              >
                {isSaving
                  ? `Efisien (Hemat ${projection.savings_percentage}%)`
                  : `Inefisien (Boros ${Math.abs(projection.savings_percentage)}%)`}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-text-muted">
              Prakiraan total biaya akhir bulan berdasarkan realisasi berjalan & sisa kebutuhan riil.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[32px]"
        >
          <PencilSimple size={14} weight="bold" />
          <span>Sesuaikan Sisa Kebutuhan</span>
        </button>
      </div>

      {/* 4-Metric Grid Calculation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Rencana Awal */}
        <div className="p-3 bg-surface-2 rounded-2xl border border-border/50 space-y-1">
          <span className="text-[10px] sm:text-[11px] text-text-muted font-semibold block">
            1. Rencana Awal
          </span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text tabular-nums whitespace-nowrap">
            {formatRupiah(projection.planned_budget)}
          </p>
          <span className="text-[10px] text-text-muted block">Batas anggaran belanja</span>
        </div>

        {/* Realisasi Terkini */}
        <div className="p-3 bg-surface-2 rounded-2xl border border-border/50 space-y-1">
          <span className="text-[10px] sm:text-[11px] text-text-muted font-semibold block">
            2. Realisasi s/d Hari Ini
          </span>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-expense tabular-nums whitespace-nowrap">
            {formatRupiah(projection.current_spent)}
          </p>
          <span className="text-[10px] text-text-muted block">
            Hari ke-{projection.days_passed} dari {projection.days_in_month}
          </span>
        </div>

        {/* Sisa Estimasi Pengeluaran */}
        <div className="p-3 bg-surface-2 rounded-2xl border border-border/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] text-text-muted font-semibold block">
              3. Sisa Kebutuhan Riil
            </span>
          </div>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-primary tabular-nums whitespace-nowrap">
            {formatRupiah(projection.remaining_estimated)}
          </p>
          <span className="text-[10px] text-text-muted block">
            {customRemaining !== null ? 'Disesuaikan manual' : 'Estimasi otomatis'}
          </span>
        </div>

        {/* Proyeksi Akhir Bulan */}
        <div
          className={`p-3 rounded-2xl border space-y-1 ${
            isSaving
              ? 'bg-primary/10 border-primary/20'
              : 'bg-expense/10 border-expense/20'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-text-muted block">
            4. Proyeksi Akhir Bulan
          </span>
          <p
            className={`text-xs sm:text-sm md:text-base font-extrabold tabular-nums whitespace-nowrap ${
              isSaving ? 'text-primary' : 'text-expense'
            }`}
          >
            {formatRupiah(projection.projected_total)}
          </p>
          <span className="text-[10px] font-semibold text-text-muted block">
            {isSaving
              ? `Hemat ${formatRupiah(projection.projected_savings)}`
              : `Lebih ${formatRupiah(Math.abs(projection.projected_savings))}`}
          </span>
        </div>
      </div>

      {/* Visual Comparison Progress Bar */}
      <div className="p-3.5 bg-surface-2/60 rounded-2xl border border-border/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-text">
            {isSaving ? (
              <CheckCircle size={16} weight="fill" className="text-income" />
            ) : (
              <WarningCircle size={16} weight="fill" className="text-expense" />
            )}
            <span>
              {isSaving
                ? `Proyeksi Akhir Bulan Lebih Hemat Rp ${new Intl.NumberFormat('id-ID').format(projection.projected_savings)} (${projection.savings_percentage}% dari Rencana)`
                : `Proyeksi Pengeluaran Melebihi Rencana Awal Rp ${new Intl.NumberFormat('id-ID').format(Math.abs(projection.projected_savings))}`}
            </span>
          </div>
          <span className="text-[11px] text-text-muted font-bold">
            {formatRupiah(projection.projected_total)} / {formatRupiah(projection.planned_budget)}
          </span>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-3 bg-surface-3 rounded-full overflow-hidden flex border border-border/40">
          <div
            className="h-full bg-expense transition-all duration-500"
            title={`Realisasi Terkini: ${formatRupiah(projection.current_spent)}`}
            style={{
              width: `${Math.min(100, (projection.current_spent / projection.planned_budget) * 100)}%`,
            }}
          />
          <div
            className="h-full bg-primary/70 transition-all duration-500"
            title={`Sisa Kebutuhan: ${formatRupiah(projection.remaining_estimated)}`}
            style={{
              width: `${Math.min(
                100 - (projection.current_spent / projection.planned_budget) * 100,
                (projection.remaining_estimated / projection.planned_budget) * 100
              )}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-expense inline-block" /> Realisasi Terkini ({formatRupiah(projection.current_spent)})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Sisa Kebutuhan ({formatRupiah(projection.remaining_estimated)})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-surface-3 border border-border inline-block" /> Sisa Hemat ({formatRupiah(Math.max(0, projection.projected_savings))})
          </span>
        </div>
      </div>

      {/* Inline Form to Edit Remaining Estimate */}
      {isEditingRemaining && (
        <form onSubmit={handleSaveRemaining} className="p-3.5 bg-surface-2 rounded-2xl border border-primary/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text">Sesuaikan Sisa Kebutuhan Pengeluaran Riil</h4>
            <button
              type="button"
              onClick={handleResetToAuto}
              className="text-[11px] font-bold text-text-muted hover:text-text hover:underline"
            >
              Reset ke Hitungan Otomatis
            </button>
          </div>

          <AmountInput
            id="editRemaining"
            label="Perkiraan sisa biaya yang masih harus dikeluarkan sampai akhir bulan (Rp)"
            value={tempRemaining}
            onChange={setTempRemaining}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingRemaining(false)}
              className="min-h-[36px] px-3.5 py-1.5 bg-surface-3 text-text rounded-xl text-xs font-semibold hover:bg-surface border border-border"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[36px] px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Terapkan Proyeksi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
