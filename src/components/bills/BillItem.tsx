'use client';

import React from 'react';
import { RecurringBill } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { CheckCircle, WarningCircle, Clock, Trash, Receipt } from '@phosphor-icons/react';

interface BillItemProps {
  bill: RecurringBill;
  onPay: (bill: RecurringBill) => void;
  onDelete: (id: string) => void;
}

export function BillItem({ bill, onPay, onDelete }: BillItemProps) {
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
      className={`p-4 md:p-5 bg-surface border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs ${
        bill.status === 'overdue' || bill.status === 'due_today'
          ? 'border-expense/40 shadow-expense/5'
          : 'border-border'
      }`}
    >
      <div className="flex items-start md:items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            bill.is_paid
              ? 'bg-income/10 text-income border-income/20'
              : bill.status === 'overdue' || bill.status === 'due_today'
              ? 'bg-expense/10 text-expense border-expense/20'
              : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
          }`}
        >
          <Receipt size={24} weight="duotone" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm md:text-base font-bold text-text">{bill.title}</h4>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-text-muted">
            Nominal: <span className="font-extrabold text-text">{formatRupiah(bill.amount)}</span>
            {bill.category_name && ` • ${bill.category_name}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end md:self-center">
        {!bill.is_paid && (
          <button
            onClick={() => onPay(bill)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
          >
            Bayar Sekarang
          </button>
        )}

        <button
          onClick={() => onDelete(bill.id)}
          title="Hapus Tagihan"
          className="p-2 text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors"
        >
          <Trash size={18} />
        </button>
      </div>
    </div>
  );
}
