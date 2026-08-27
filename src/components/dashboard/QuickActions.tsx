'use client';

import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Vault,
  Receipt,
  HandCoins,
  ChartPieSlice,
  Package,
  Heartbeat,
  Sparkle,
} from '@phosphor-icons/react';
import { NavTab } from '../layout/BottomNav';
import { TransactionType } from '@/lib/types';

interface QuickActionsProps {
  onOpenTransactionModal: (type: TransactionType) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenReceiptScan?: () => void;
  pendingBillsCount?: number;
  overbudgetCount?: number;
  unpaidDebtsCount?: number;
}

export function QuickActions({
  onOpenTransactionModal,
  onNavigate,
  onOpenReceiptScan,
  pendingBillsCount = 0,
  overbudgetCount = 0,
  unpaidDebtsCount = 0,
}: QuickActionsProps) {

  const MODULE_SHORTCUTS = [
    {
      label: 'Anggaran',
      icon: Vault,
      color: 'bg-warning/10 text-warning border-warning/20',
      badge: overbudgetCount > 0 ? overbudgetCount : undefined,
      action: () => onNavigate('budget'),
    },
    {
      label: 'Tagihan',
      icon: Receipt,
      color: 'bg-primary/10 text-primary border-primary/20',
      badge: pendingBillsCount > 0 ? pendingBillsCount : undefined,
      action: () => onNavigate('bills'),
    },
    {
      label: 'Hutang',
      icon: HandCoins,
      color: 'bg-expense/10 text-expense border-expense/25',
      badge: unpaidDebtsCount > 0 ? unpaidDebtsCount : undefined,
      action: () => onNavigate('debts'),
    },
    {
      label: 'Aset',
      icon: Package,
      color: 'bg-surface-2 text-text-muted border-border',
      action: () => onNavigate('assets'),
    },
    {
      label: 'Laporan',
      icon: ChartPieSlice,
      color: 'bg-transfer/10 text-transfer border-transfer/20',
      action: () => onNavigate('reports'),
    },
    {
      label: 'Evaluasi',
      icon: Heartbeat,
      color: 'bg-income/10 text-income border-income/25',
      action: () => onNavigate('evaluation'),
    },
  ];

  return (
    <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-2.5 shadow-2xs">
      {/* Top: Primary Action Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {/* Button 1: Pengeluaran */}
        <button
          type="button"
          onClick={() => onOpenTransactionModal('expense')}
          className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 rounded-xl bg-expense/10 hover:bg-expense/15 border border-expense/25 text-expense font-bold text-xs sm:text-sm active:scale-[0.98] transition-all group shadow-2xs"
        >
          <div className="w-6 h-6 rounded-lg bg-expense/15 flex items-center justify-center shrink-0">
            <ArrowDownRight size={15} weight="bold" />
          </div>
          <span className="truncate">Pengeluaran</span>
        </button>

        {/* Button 2: Pemasukan */}
        <button
          type="button"
          onClick={() => onOpenTransactionModal('income')}
          className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 rounded-xl bg-income/10 hover:bg-income/15 border border-income/25 text-income font-bold text-xs sm:text-sm active:scale-[0.98] transition-all group shadow-2xs"
        >
          <div className="w-6 h-6 rounded-lg bg-income/15 flex items-center justify-center shrink-0">
            <ArrowUpRight size={15} weight="bold" />
          </div>
          <span className="truncate">Pemasukan</span>
        </button>

        {/* Button 3: Transfer */}
        <button
          type="button"
          onClick={() => onOpenTransactionModal('transfer')}
          className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 rounded-xl bg-transfer/10 hover:bg-transfer/15 border border-transfer/25 text-transfer font-bold text-xs sm:text-sm active:scale-[0.98] transition-all group shadow-2xs"
        >
          <div className="w-6 h-6 rounded-lg bg-transfer/15 flex items-center justify-center shrink-0">
            <ArrowsLeftRight size={15} weight="bold" />
          </div>
          <span className="truncate">Transfer</span>
        </button>

        {/* Button 4: Scan AI Struk */}
        {onOpenReceiptScan && (
          <button
            type="button"
            onClick={onOpenReceiptScan}
            className="hidden sm:flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary font-bold text-xs sm:text-sm active:scale-[0.98] transition-all group shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkle size={15} weight="fill" />
            </div>
            <span className="truncate">Scan Struk</span>
          </button>
        )}
      </div>


      {/* Bottom: 6 Symmetrical Module Shortcuts — Desktop only */}
      <div className="hidden md:grid grid-cols-6 gap-1 sm:gap-2 pt-1 border-t border-border/60">
        {MODULE_SHORTCUTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-surface-2 active:scale-95 transition-all text-center group relative min-w-0"
            >
              {item.badge !== undefined && (
                <span className="absolute top-0.5 right-1 w-3.5 h-3.5 bg-expense text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border shadow-2xs mb-1 transition-transform group-hover:scale-105 ${item.color}`}
              >
                <Icon size={15} weight="duotone" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted group-hover:text-text text-center leading-tight tracking-tight max-w-full truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
