'use client';

import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Vault,
  Receipt,
  Wallet,
  ChartPieSlice,
  Gear,
} from '@phosphor-icons/react';
import { NavTab } from '../layout/BottomNav';
import { TransactionType } from '@/lib/types';

interface QuickActionsProps {
  onOpenTransactionModal: (type: TransactionType) => void;
  onNavigate: (tab: NavTab) => void;
  pendingBillsCount?: number;
  overbudgetCount?: number;
}

export function QuickActions({
  onOpenTransactionModal,
  onNavigate,
  pendingBillsCount = 0,
  overbudgetCount = 0,
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
      label: 'Transfer Kas',
      icon: ArrowsLeftRight,
      color: 'bg-transfer/10 text-transfer border-transfer/20',
      action: () => onOpenTransactionModal('transfer'),
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
      label: 'Pos Dompet',
      icon: Wallet,
      color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      action: () => onNavigate('wallets'),
    },
    {
      label: 'Laporan',
      icon: ChartPieSlice,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      action: () => onNavigate('reports'),
    },
    {
      label: 'Pengaturan',
      icon: Gear,
      color: 'bg-surface-2 text-text border-border',
      action: () => onNavigate('settings'),
    },
  ];

  return (
    <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {ACTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-surface-2 active:scale-95 transition-all text-center group relative"
            >
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2 md:right-4 w-4 h-4 bg-expense text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs mb-1.5 transition-transform group-hover:scale-105 ${item.color}`}
              >
                <Icon size={24} weight="duotone" />
              </div>
              <span className="text-[11px] md:text-xs font-bold text-text truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
