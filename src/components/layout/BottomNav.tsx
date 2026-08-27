'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  House,
  ListDashes,
  Wallet,
  DotsThree,
  X,
  Vault,
  Receipt,
  HandCoins,
  Target,
  Package,
  ChartPieSlice,
  Heartbeat,
  Gear,
  ArrowDownRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Plus,
} from '@phosphor-icons/react';
import { TransactionType } from '@/lib/types';

export type NavTab = 'dashboard' | 'transactions' | 'budget' | 'reports' | 'evaluation' | 'wallets' | 'bills' | 'debts' | 'assets' | 'goals' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenTypedModal?: (type: TransactionType) => void;
  pendingBillsCount?: number;
  overbudgetCount?: number;
  unpaidDebtsCount?: number;
}

export function BottomNav({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenTypedModal,
  pendingBillsCount = 0,
  overbudgetCount = 0,
  unpaidDebtsCount = 0,
}: BottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside tap (pointerdown menutupi mouse + sentuh)
  useEffect(() => {
    if (!isMoreOpen) return;
    const handle = (e: PointerEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [isMoreOpen]);

  // Keyboard: Escape menutup sheet dan mengembalikan fokus ke trigger (R-32)
  useEffect(() => {
    if (!isMoreOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMoreOpen(false);
        moreTriggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMoreOpen]);

  // Close sheet if navigating
  const handleTabChange = (tab: NavTab) => {
    setIsMoreOpen(false);
    onTabChange(tab);
  };

  const handleTypeModal = (type: TransactionType) => {
    setIsMoreOpen(false);
    if (onOpenTypedModal) onOpenTypedModal(type);
    else onOpenAddModal();
  };

  const TAB_PRIMARY: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Beranda', icon: House },
    { id: 'transactions', label: 'Transaksi', icon: ListDashes },
  ];

  const TAB_RIGHT: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'wallets', label: 'Dompet', icon: Wallet },
  ];

  // Ikon modul NETRAL sesuai DESIGN.md: palet maksimal 3 core + aksen semantik.
  const MORE_MODULES = [
    { id: 'budget' as NavTab, label: 'Anggaran', icon: Vault, badge: overbudgetCount > 0 ? overbudgetCount : undefined },
    { id: 'bills' as NavTab, label: 'Tagihan', icon: Receipt, badge: pendingBillsCount > 0 ? pendingBillsCount : undefined },
    { id: 'debts' as NavTab, label: 'Hutang', icon: HandCoins, badge: unpaidDebtsCount > 0 ? unpaidDebtsCount : undefined },
    { id: 'goals' as NavTab, label: 'Target', icon: Target },
    { id: 'assets' as NavTab, label: 'Aset', icon: Package },
    { id: 'reports' as NavTab, label: 'Laporan', icon: ChartPieSlice },
    { id: 'evaluation' as NavTab, label: 'Evaluasi', icon: Heartbeat },
    { id: 'settings' as NavTab, label: 'Pengaturan', icon: Gear },
  ];

  const iMoreActive = ['budget', 'bills', 'debts', 'assets', 'goals', 'reports', 'evaluation', 'settings'].includes(activeTab);
  const totalBadge = (overbudgetCount > 0 ? 1 : 0) + (pendingBillsCount > 0 ? 1 : 0) + (unpaidDebtsCount > 0 ? 1 : 0);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/97 backdrop-blur-xl border-t border-border pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 pt-1 relative">
          {/* Left Tabs */}
          {TAB_PRIMARY.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[46px] rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full" style={{ position: 'absolute', bottom: '2px' }} />
                )}
              </button>
            );
          })}

          {/* Center FAB */}
          <div className="relative -top-4 flex flex-col items-center">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="w-14 h-14 bg-primary text-primary-fg rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-surface active:scale-90 transition-transform"
              aria-label="Catat Transaksi Baru"
            >
              <Plus size={26} weight="bold" />
            </button>
            <span className="text-[10px] font-bold text-primary mt-0.5">Catat</span>
          </div>

          {/* Right: Dompet */}
          {TAB_RIGHT.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[46px] rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Right: Lainnya */}
          <button
            type="button"
            ref={moreTriggerRef}
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            aria-expanded={isMoreOpen}
            className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[46px] rounded-xl transition-all relative ${
              iMoreActive || isMoreOpen ? 'text-primary' : 'text-text-muted'
            }`}
          >
            {totalBadge > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-expense text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {totalBadge}
              </span>
            )}
            {isMoreOpen ? <X size={22} weight="bold" /> : <DotsThree size={22} weight="bold" />}
            <span className={`text-[10px] mt-0.5 font-semibold ${iMoreActive || isMoreOpen ? 'text-primary' : 'text-text-muted'}`}>
              Lainnya
            </span>
          </button>
        </div>
      </nav>

      {/* More Sheet Overlay */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-fade-in" onClick={() => setIsMoreOpen(false)} />
      )}

      {/* More Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out pb-[max(env(safe-area-inset-bottom),1.5rem)] ${
          isMoreOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div className="px-4 pb-2 space-y-3">
          {/* Sheet Title */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-text">Menu Lainnya</h3>
            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Transaction Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTypeModal('expense')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-expense/10 border border-expense/20 text-expense font-bold text-xs active:scale-95 transition-all"
            >
              <ArrowDownRight size={16} weight="bold" />
              <span>Keluar</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeModal('income')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-income/10 border border-income/20 text-income font-bold text-xs active:scale-95 transition-all"
            >
              <ArrowUpRight size={16} weight="bold" />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeModal('transfer')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-transfer/10 border border-transfer/20 text-transfer font-bold text-xs active:scale-95 transition-all"
            >
              <ArrowsLeftRight size={16} weight="bold" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {MORE_MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeTab === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleTabChange(mod.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all active:scale-95 relative ${
                    isActive ? 'bg-primary/10 border border-primary/20' : 'bg-surface-2 border border-border/50 hover:bg-surface-3'
                  }`}
                >
                  {mod.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-expense text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {mod.badge}
                    </span>
                  )}
                  <Icon
                    size={24}
                    weight={isActive ? 'fill' : 'duotone'}
                    className={isActive ? 'text-primary' : 'text-text-muted'}
                  />
                  <span className={`text-[10px] font-semibold leading-tight text-center ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                    {mod.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
