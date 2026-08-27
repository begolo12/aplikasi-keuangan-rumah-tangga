'use client';

import React from 'react';
import { Budget } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Warning, Trash, PencilSimple } from '@phosphor-icons/react';

interface BudgetProgressBarProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

export function BudgetProgressBar({ budget, onEdit, onDelete }: BudgetProgressBarProps) {
  const percentage = Math.min(budget.percentage || 0, 100);
  const isOver = (budget.spent || 0) > budget.monthly_limit;
  const isWarning = budget.percentage >= 70 && budget.percentage < 90;
  const isCritical = budget.percentage >= 90 && !isOver;

  const barColor = isOver
    ? 'bg-expense'
    : isCritical
    ? 'bg-warning'
    : isWarning
    ? 'bg-warning/70'
    : 'bg-primary';

  return (
    <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-xs hover:border-primary/30 transition-all min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <CategoryIcon
            name={budget.category_icon || 'vault'}
            color={budget.category_color || 'teal'}
            size={18}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-text leading-tight truncate">{budget.category_name}</h4>
            <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 flex flex-wrap items-center gap-1">
              <span>Terpakai: <span className="font-bold text-text whitespace-nowrap tabular-nums">{formatRupiah(budget.spent)}</span></span>
              <span>/</span>
              <span className="whitespace-nowrap tabular-nums">{formatRupiah(budget.monthly_limit)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(budget)}
            title="Ubah Batas Limit"
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-lg transition-colors"
          >
            <PencilSimple size={16} />
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            title="Hapus Anggaran"
            className="p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5">
        <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-semibold gap-2">
          <span className="text-text-muted truncate">
            {isOver ? (
              <span className="text-expense font-bold flex items-center gap-1">
                <Warning size={14} weight="fill" className="shrink-0" />
                <span className="whitespace-nowrap tabular-nums">Overbudget +{formatRupiah(Math.abs(budget.remaining))}</span>
              </span>
            ) : (
              <span>Sisa: <span className="whitespace-nowrap tabular-nums">{formatRupiah(budget.remaining)}</span></span>
            )}
          </span>
          <span className={`font-extrabold ${isOver ? 'text-expense' : 'text-text'}`}>
            {budget.percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
