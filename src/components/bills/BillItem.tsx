'use client';

import React, { useState } from 'react';
import { RecurringBill } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { CheckCircle, WarningCircle, Clock, Trash, Receipt } from '@phosphor-icons/react';

interface BillItemProps {
  bill: RecurringBill;
  onPay: (bill: RecurringBill) => void;
  onDelete: (id: string) => void;
}

export function BillItem({ bill, onPay, onDelete }: BillItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const getStatusBadge = () => {
    switch (bill.status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-income bg-income/10 px-2.5 py-1 rounded-full border border-income/20">
            <CheckCircle size={14} weight="fill" />
            <span>Lunas</span>
          </span>
        );
      case 'due_today':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-expense bg-expense/10 px-2.5 py-1 rounded-full border border-expense/20 animate-pulse">
            <WarningCircle size={14} weight="fill" />
            <span>Jatuh Tempo Hari Ini</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-expense bg-expense/10 px-2.5 py-1 rounded-full border border-expense/20">
            <WarningCircle size={14} weight="fill" />
            <span>Menunggak</span>
          </span>
        );
      case 'due_soon':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock size={14} weight="bold" />
            <span>Jatuh Tempo {bill.days_until_due} Hari Lagi</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-text-muted bg-surface-2 px-2.5 py-1 rounded-full border border-border">
            <Clock size={14} />
            <span>Tgl {bill.due_day} Setiap Bulan</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 md:p-5 bg-surface border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all shadow-xs min-w-0 ${
        bill.status === 'overdue' || bill.status === 'due_today'
          ? 'border-expense/40 shadow-expense/5'
          : 'border-border hover:border-primary/30'
      }`}
    >
      <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            bill.is_paid
              ? 'bg-income/10 text-income border-income/20'
              : bill.status === 'overdue' || bill.status === 'due_today'
              ? 'bg-expense/10 text-expense border-expense/20'
              : 'bg-primary/10 text-primary border-primary/20'
          }`}
        >
          <Receipt size={22} weight="duotone" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm md:text-base font-bold text-text truncate max-w-full">{bill.title}</h4>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-text-muted">
            Nominal: <span className="font-extrabold text-text whitespace-nowrap tabular-nums">{formatRupiah(bill.amount)}</span>
            {bill.category_name && ` • ${bill.category_name}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-end md:self-center justify-end shrink-0">
        {!bill.is_paid && (
          <button
            onClick={() => onPay(bill)}
            className="min-h-[40px] px-3.5 sm:px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
          >
            Bayar Sekarang
          </button>
        )}

        {showConfirm ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onDelete(bill.id);
                setShowConfirm(false);
              }}
              className="min-h-[38px] px-3 py-1.5 bg-expense text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-2xs"
            >
              Hapus
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="min-h-[38px] px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-text text-xs font-semibold rounded-xl border border-border transition-colors"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            title="Hapus Tagihan"
            aria-label={`Hapus tagihan ${bill.title}`}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors"
          >
            <Trash size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
