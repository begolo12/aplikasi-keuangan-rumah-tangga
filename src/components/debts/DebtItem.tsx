'use client';

import React, { useState } from 'react';
import { Debt } from '@/lib/types';
import { formatRupiah, formatDate } from '@/lib/formatters';
import {
  CheckCircle,
  WarningCircle,
  Clock,
  Trash,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
} from '@phosphor-icons/react';

interface DebtItemProps {
  debt: Debt;
  onPay: (debt: Debt) => void;
  onDelete: (id: string) => void;
}

export function DebtItem({ debt, onPay, onDelete }: DebtItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const isPayable = debt.type === 'payable';
  const isPaid = debt.status === 'paid';
  const percentage = Math.min(
    debt.total_amount > 0 ? Math.round((debt.paid_amount / debt.total_amount) * 100) : 0,
    100
  );

  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-income bg-income/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-income/20">
          <CheckCircle size={13} weight="fill" />
          <span>Lunas</span>
        </span>
      );
    }

    if (debt.is_overdue) {
      return (
        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-expense bg-expense/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-expense/20">
          <WarningCircle size={13} weight="fill" />
          <span>Menunggak</span>
        </span>
      );
    }

    if (debt.days_until_due !== undefined && debt.days_until_due !== null) {
      if (debt.days_until_due === 0) {
        return (
          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-expense bg-expense/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-expense/20 animate-pulse">
            <WarningCircle size={13} weight="fill" />
            <span>Jatuh Tempo Hari Ini</span>
          </span>
        );
      }
      if (debt.days_until_due > 0 && debt.days_until_due <= 7) {
        return (
          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-500/20">
            <Clock size={13} weight="bold" />
            <span>Jatuh Tempo {debt.days_until_due} Hari Lagi</span>
          </span>
        );
      }
    }

    if (debt.due_date) {
      return (
        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-text-muted bg-surface-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-border">
          <Clock size={13} />
          <span>Jatuh Tempo: {formatDate(debt.due_date, 'short')}</span>
        </span>
      );
    }

    return (
      <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted bg-surface-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-border">
        Tanpa Batas Waktu
      </span>
    );
  };

  return (
    <div
      className={`p-3.5 sm:p-4 md:p-5 bg-surface border rounded-3xl space-y-3.5 transition-all shadow-xs min-w-0 ${
        debt.is_overdue ? 'border-expense/40 shadow-expense/5' : 'border-border hover:border-primary/30'
      }`}
    >
      {/* Top row: Person & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isPaid
                ? 'bg-income/10 text-income border-income/20'
                : isPayable
                ? 'bg-expense/10 text-expense border-expense/20'
                : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
            }`}
          >
            {isPayable ? (
              <ArrowDownRight size={20} weight="bold" />
            ) : (
              <ArrowUpRight size={20} weight="bold" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm md:text-base font-bold text-text truncate max-w-full">
                {debt.person_name}
              </h4>
              {getStatusBadge()}
            </div>
            {debt.notes && (
              <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 truncate">
                {debt.notes}
              </p>
            )}
          </div>
        </div>

        {showConfirm ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                onDelete(debt.id);
                setShowConfirm(false);
              }}
              className="min-h-[34px] px-2.5 py-1 bg-expense text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-2xs"
            >
              Hapus
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="min-h-[34px] px-2.5 py-1 bg-surface-2 hover:bg-surface-3 text-text text-xs font-semibold rounded-xl border border-border transition-colors"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            title="Hapus Data"
            aria-label={`Hapus ${debt.person_name}`}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors shrink-0"
          >
            <Trash size={17} />
          </button>
        )}
      </div>

      {/* Amounts & Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold gap-2">
          <span className="text-text-muted truncate">
            {isPayable ? 'Sisa Hutang: ' : 'Sisa Piutang: '}
            <span className={`font-extrabold whitespace-nowrap tabular-nums ${isPaid ? 'text-income' : isPayable ? 'text-expense' : 'text-primary'}`}>
              {formatRupiah(debt.remaining_amount)}
            </span>
          </span>
          <span className="text-text-muted text-[11px] whitespace-nowrap tabular-nums shrink-0">
            Total: {formatRupiah(debt.total_amount)}
          </span>
        </div>

        <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPaid ? 'bg-income' : isPayable ? 'bg-expense' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>Sudah Dibayar: <span className="font-semibold text-text whitespace-nowrap tabular-nums">{formatRupiah(debt.paid_amount)}</span></span>
          <span className="font-bold">{percentage}%</span>
        </div>
      </div>

      {/* Bottom Actions */}
      {!isPaid && (
        <div className="pt-1 flex items-center justify-end">
          <button
            onClick={() => onPay(debt)}
            className={`w-full sm:w-auto min-h-[42px] px-4 py-2 text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 ${
              isPayable
                ? 'bg-expense text-white hover:bg-expense/90'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            <HandCoins size={16} weight="bold" />
            <span>{isPayable ? 'Bayar Cicilan Hutang' : 'Terima Pembayaran Piutang'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
