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
  CalendarBlank,
  UsersThree,
  Clock,
} from '@phosphor-icons/react';
import { TransactionType } from '@/lib/types';

export type NavTab = 'dashboard' | 'transactions' | 'calendar' | 'budget' | 'reports' | 'evaluation' | 'wallets' | 'bills' | 'subscriptions' | 'debts' | 'assets' | 'goals' | 'household' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenTypedModal?: (type: TransactionType) => void;
  pendingBillsCount?: number;
  overbudgetCount?: number;
  unpaidDebtsCount?: number;
  householdActivityCount?: number;
  subscriptionCount?: number;
}

export function BottomNav({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenTypedModal,
  pendingBillsCount = 0,
  overbudgetCount = 0,
  unpaidDebtsCount = 0,
  householdActivityCount = 0,
  subscriptionCount = 0,
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
    { id: 'calendar' as NavTab, label: 'Kalender', icon: CalendarBlank },
    { id: 'household' as NavTab, label: 'Keluarga', icon: UsersThree, badge: householdActivityCount > 0 ? householdActivityCount : undefined },
    { id: 'budget' as NavTab, label: 'Anggaran', icon: Vault, badge: overbudgetCount > 0 ? overbudgetCount : undefined },
    { id: 'bills' as NavTab, label: 'Tagihan', icon: Receipt, badge: pendingBillsCount > 0 ? pendingBillsCount : undefined },
    { id: 'subscriptions' as NavTab, label: 'Langganan', icon: Clock, badge: subscriptionCount > 0 ? subscriptionCount : undefined },
    { id: 'debts' as NavTab, label: 'Hutang', icon: HandCoins, badge: unpaidDebtsCount > 0 ? unpaidDebtsCount : undefined },
    { id: 'goals' as NavTab, label: 'Target', icon: Target },
    { id: 'assets' as NavTab, label: 'Aset', icon: Package },
    { id: 'reports' as NavTab, label: 'Laporan', icon: ChartPieSlice },
    { id: 'evaluation' as NavTab, label: 'Evaluasi', icon: Heartbeat },
    { id: 'settings' as NavTab, label: 'Pengaturan', icon: Gear },
  ];

  const iMoreActive = ['calendar', 'household', 'budget', 'bills', 'subscriptions', 'debts', 'assets', 'goals', 'reports', 'evaluation', 'settings'].includes(activeTab);
  const totalBadge = (overbudgetCount > 0 ? 1 : 0) + (pendingBillsCount > 0 ? 1 : 0) + (unpaidDebtsCount > 0 ? 1 : 0) + (subscriptionCount > 0 ? 1 : 0) + (householdActivityCount > 0 ? 1 : 0);

  return (
    <>
      {/* Bottom Navigation Bar
          Catatan: TIDAK memakai backdrop-blur. Blur pada elemen fixed memicu repaint
          di setiap frame scroll dan itulah penyebab nav terlihat bergoyang di HP.
          Warna solid + border sudah cukup dan jauh lebih murah. */}
      <nav
        aria-label="Navigasi Utama Bawah"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[max(env(safe-area-inset-bottom),0.25rem)]"
      >
        <div className="flex items-end justify-around max-w-lg mx-auto px-1 pt-1.5">
          {/* Left Tabs */}
          {TAB_PRIMARY.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[56px] min-h-[48px] rounded-xl transition-colors duration-150 ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-[10px] mt-0.5 font-semibold">{tab.label}</span>
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}

          {/* Center FAB: duduk rata dengan baris tab, tidak lagi menonjol keluar
              (overhang negatif membuat tinggi nav berubah dan memicu goyangan). */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onOpenAddModal}
              data-tap-target="lg"
              className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] bg-primary text-primary-fg rounded-full flex items-center justify-center shadow-lg shadow-primary/25 active:scale-90 transition-transform"
              aria-label="Catat Transaksi Baru"
            >
              <Plus size={24} weight="bold" />
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
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[56px] min-h-[48px] rounded-xl transition-colors duration-150 ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-[10px] mt-0.5 font-semibold">{tab.label}</span>
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}

          {/* Right: Lainnya */}
          <button
            type="button"
            ref={moreTriggerRef}
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            aria-expanded={isMoreOpen}
            aria-label="Menu lainnya"
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[56px] min-h-[48px] rounded-xl transition-colors duration-150 ${
              iMoreActive || isMoreOpen ? 'text-primary' : 'text-text-muted'
            }`}
          >
            {totalBadge > 0 && (
              <span className="absolute top-1.5 right-2.5 w-4 h-4 bg-expense text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {totalBadge}
              </span>
            )}
            {isMoreOpen ? <X size={22} weight="bold" /> : <DotsThree size={22} weight="bold" />}
            <span className="text-[10px] mt-0.5 font-semibold">Lainnya</span>
            {(iMoreActive || isMoreOpen) && (
              <span className="absolute top-0 w-6 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </nav>

      {/* More Sheet Overlay */}
      {isMoreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/45 animate-fade-in"
          onClick={() => setIsMoreOpen(false)}
        />
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
              aria-label="Tutup menu"
              className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
