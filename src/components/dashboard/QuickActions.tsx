'use client';

import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Vault,
  Receipt,
  HandCoins,
  Wallet,
  ChartPieSlice,
  Package,
} from '@phosphor-icons/react';
import { NavTab } from '../layout/BottomNav';
import { TransactionType } from '@/lib/types';

interface QuickActionsProps {
  onOpenTransactionModal: (type: TransactionType) => void;
  onNavigate: (tab: NavTab) => void;
  pendingBillsCount?: number;
  overbudgetCount?: number;
  unpaidDebtsCount?: number;
}

export function QuickActions({
  onOpenTransactionModal,
  onNavigate,
  pendingBillsCount = 0,
  overbudgetCount = 0,
  unpaidDebtsCount = 0,
}: QuickActionsProps) {
  const ACTIONS = [
    {
      label: 'Pengeluaran',
      icon: ArrowDownRight,
      color: 'bg-expense/10 text-expense border-expense/20',
      action: () => onOpenTransactionModal('expense'),
    },
    {
      label: 'Pemasukan',
      icon: ArrowUpRight,
      color: 'bg-income/10 text-income border-income/20',
      action: () => onOpenTransactionModal('income'),
    },
    {
      label: 'Transfer',
      icon: ArrowsLeftRight,
      color: 'bg-transfer/10 text-transfer border-transfer/20',
      action: () => onOpenTransactionModal('transfer'),
    },
    {
      label: 'Hutang',
      icon: HandCoins,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      badge: unpaidDebtsCount > 0 ? unpaidDebtsCount : undefined,
      action: () => onNavigate('debts'),
    },
    {
      label: 'Anggaran',
      icon: Vault,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      badge: overbudgetCount > 0 ? overbudgetCount : undefined,
      action: () => onNavigate('budget'),
    },
    {
      label: 'Tagihan',
      icon: Receipt,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      badge: pendingBillsCount > 0 ? pendingBillsCount : undefined,
      action: () => onNavigate('bills'),
    },
    {
      label: 'Pos Kas',
      icon: Wallet,
      color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      action: () => onNavigate('wallets'),
    },
    {
      label: 'Aset',
      icon: Package,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      action: () => onNavigate('assets'),
    },
    {
      label: 'Laporan',
      icon: ChartPieSlice,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      action: () => onNavigate('reports'),
    },
  ];

  return (
    <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 md:p-4 shadow-2xs">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-1 sm:gap-2">
        {ACTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center justify-start p-1 sm:p-1.5 rounded-xl hover:bg-surface-2 active:scale-95 transition-all text-center group relative min-w-0"
            >
              {item.badge !== undefined && (
                <span className="absolute top-0 right-1 sm:right-2 w-3.5 h-3.5 bg-expense text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shadow-2xs mb-1 transition-transform group-hover:scale-105 ${item.color}`}
              >
                <Icon size={18} weight="duotone" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-text text-center leading-tight tracking-tight max-w-full truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
