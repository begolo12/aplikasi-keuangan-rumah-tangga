'use client';

import React from 'react';
import { House, ListDashes, Plus, ChartPieSlice, Vault } from '@phosphor-icons/react';

export type NavTab = 'dashboard' | 'transactions' | 'budget' | 'reports' | 'evaluation' | 'wallets' | 'bills' | 'debts' | 'assets' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
}

export function BottomNav({ activeTab, onTabChange, onOpenAddModal }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border px-2 py-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-lg transition-colors">
      <div className="flex items-center justify-around max-w-lg mx-auto relative">
        {/* Tab 1: Beranda */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
          }`}
        >
          <House size={22} weight={activeTab === 'dashboard' ? 'fill' : 'regular'} />
          <span className="text-[10px] mt-0.5">Beranda</span>
        </button>

        {/* Tab 2: Transaksi */}
        <button
          type="button"
          onClick={() => onTabChange('transactions')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            activeTab === 'transactions' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
          }`}
        >
          <ListDashes size={22} weight={activeTab === 'transactions' ? 'fill' : 'regular'} />
          <span className="text-[10px] mt-0.5">Transaksi</span>
        </button>

        {/* Center Elevated FAB: Add Transaction */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-14 h-14 bg-primary text-primary-fg rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-background active:scale-90 transition-transform"
            aria-label="Catat Transaksi Baru"
          >
            <Plus size={26} weight="bold" />
          </button>
          <span className="text-[10px] font-bold text-primary -mt-0.5">Catat</span>
        </div>

        {/* Tab 3: Anggaran */}
        <button
          type="button"
          onClick={() => onTabChange('budget')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            activeTab === 'budget' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
          }`}
        >
          <Vault size={22} weight={activeTab === 'budget' ? 'fill' : 'regular'} />
          <span className="text-[10px] mt-0.5">Anggaran</span>
        </button>

        {/* Tab 4: Laporan */}
        <button
          type="button"
          onClick={() => onTabChange('reports')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
            activeTab === 'reports' ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
          }`}
        >
          <ChartPieSlice size={22} weight={activeTab === 'reports' ? 'fill' : 'regular'} />
          <span className="text-[10px] mt-0.5">Laporan</span>
        </button>
      </div>
    </nav>
  );
}
