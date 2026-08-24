'use client';

import {
  House,
  ListDashes,
  Vault,
  Receipt,
  Wallet,
  HandCoins,
  ChartPieSlice,
  Gear,
  Plus,
  SignOut,
  Keyboard,
} from '@phosphor-icons/react';
import { NavTab } from './BottomNav';

interface SidebarNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  userName?: string;
  familyName?: string;
  onLogout: () => void;
}

export function SidebarNav({
  activeTab,
  onTabChange,
  onOpenAddModal,
  userName = 'Pengguna',
  familyName = 'Keluarga Bahagia',
  onLogout,
}: SidebarNavProps) {
  const NAV_ITEMS: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Beranda', icon: House },
    { id: 'transactions', label: 'Riwayat Transaksi', icon: ListDashes },
    { id: 'budget', label: 'Anggaran Bulanan', icon: Vault },
    { id: 'bills', label: 'Tagihan Rutin', icon: Receipt },
    { id: 'debts', label: 'Hutang & Piutang', icon: HandCoins },
    { id: 'wallets', label: 'Pos Kas & Dompet', icon: Wallet },
    { id: 'reports', label: 'Laporan & Ekspor', icon: ChartPieSlice },
    { id: 'settings', label: 'Pengaturan & Backup', icon: Gear },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface border-r border-border min-h-screen p-5 sticky top-0 h-screen justify-between transition-all">
      {/* Top Brand Logo */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-primary text-primary-fg rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Wallet size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-text leading-tight">KasKeluarga</h2>
            <p className="text-[11px] text-text-muted font-medium">{familyName}</p>
          </div>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onOpenAddModal}
          className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all text-sm"
        >
          <Plus size={18} weight="bold" />
          <span>Catat Transaksi</span>
          <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">N</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                    : 'text-text-muted hover:text-text hover:bg-surface-2'
                }`}
              >
                <Icon size={20} weight={isActive ? 'duotone' : 'regular'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Shortcuts */}
      <div className="space-y-4 pt-4 border-t border-border">
        {/* Keyboard shortcut guide */}
        <div className="bg-background/50 p-2.5 rounded-xl border border-border/60 text-[11px] text-text-muted space-y-1 hidden lg:block">
          <div className="flex items-center gap-1 font-semibold text-text mb-1">
            <Keyboard size={14} />
            <span>Pintasan Keyboard</span>
          </div>
          <div className="flex justify-between">
            <span>Pengeluaran</span>
            <kbd className="bg-surface px-1.5 rounded border text-[10px] font-mono">E</kbd>
          </div>
          <div className="flex justify-between">
            <span>Pemasukan</span>
            <kbd className="bg-surface px-1.5 rounded border text-[10px] font-mono">I</kbd>
          </div>
          <div className="flex justify-between">
            <span>Transfer</span>
            <kbd className="bg-surface px-1.5 rounded border text-[10px] font-mono">T</kbd>
          </div>
          <div className="flex justify-between">
            <span>Tutup Dialog</span>
            <kbd className="bg-surface px-1.5 rounded border text-[10px] font-mono">Esc</kbd>
          </div>
        </div>

        {/* User profile info & logout */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center font-bold text-xs shrink-0 text-text">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-text truncate">{userName}</p>
              <p className="text-[10px] text-text-muted truncate">Akun Terhubung</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Keluar"
            className="p-2 text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors shrink-0"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
