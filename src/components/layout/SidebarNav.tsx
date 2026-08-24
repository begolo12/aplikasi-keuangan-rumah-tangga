import React, { useState, useRef, useEffect } from 'react';
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
  CaretDown,
  ArrowDownRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Package,
} from '@phosphor-icons/react';
import { NavTab } from './BottomNav';
import { TransactionType } from '@/lib/types';

interface SidebarNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenTypedModal?: (type: TransactionType) => void;
  userName?: string;
  familyName?: string;
  onLogout: () => void;
}

export function SidebarNav({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenTypedModal,
  userName = 'Pengguna',
  familyName = 'Kas Pribadi',
  onLogout,
}: SidebarNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleSelectType = (type: TransactionType) => {
    setIsDropdownOpen(false);
    if (onOpenTypedModal) {
      onOpenTypedModal(type);
    } else {
      onOpenAddModal();
    }
  };

  const NAV_ITEMS: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Beranda', icon: House },
    { id: 'transactions', label: 'Riwayat Transaksi', icon: ListDashes },
    { id: 'budget', label: 'Anggaran Bulanan', icon: Vault },
    { id: 'bills', label: 'Tagihan Rutin', icon: Receipt },
    { id: 'debts', label: 'Hutang & Piutang', icon: HandCoins },
    { id: 'assets', label: 'Aset & Depresiasi', icon: Package },
    { id: 'wallets', label: 'Pos Kas & Dompet', icon: Wallet },
    { id: 'reports', label: 'Laporan & Ekspor', icon: ChartPieSlice },
    { id: 'settings', label: 'Pengaturan & Backup', icon: Gear },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface border-r border-border min-h-screen p-5 sticky top-0 h-screen justify-between transition-all">
      {/* Top Brand Logo */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-primary text-primary-fg rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Wallet size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-text leading-tight">KasPribadi</h2>
            <p className="text-[11px] text-text-muted font-medium truncate max-w-[130px]">{familyName}</p>
          </div>
        </div>

        {/* Quick Add Button with Dropdown Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-2xl flex items-center justify-between px-3.5 shadow-sm active:scale-98 transition-all text-sm group"
          >
            <div className="flex items-center gap-2">
              <Plus size={18} weight="bold" />
              <span>Catat Transaksi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">N</span>
              <CaretDown
                size={14}
                weight="bold"
                className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-surface border border-border rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Pilih Jenis Transaksi
              </div>

              {/* Option 1: Pengeluaran */}
              <button
                type="button"
                onClick={() => handleSelectType('expense')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-expense/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-expense/10 text-expense flex items-center justify-center shrink-0 border border-expense/20">
                    <ArrowDownRight size={17} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-expense transition-colors">
                      Pengeluaran
                    </p>
                    <p className="text-[10px] text-text-muted truncate">Belanja & uang keluar</p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted">
                  E
                </kbd>
              </button>

              {/* Option 2: Pemasukan */}
              <button
                type="button"
                onClick={() => handleSelectType('income')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-income/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-income/10 text-income flex items-center justify-center shrink-0 border border-income/20">
                    <ArrowUpRight size={17} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-income transition-colors">
                      Pemasukan
                    </p>
                    <p className="text-[10px] text-text-muted truncate">Gaji, bonus & dividen</p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted">
                  I
                </kbd>
              </button>

              {/* Option 3: Transfer */}
              <button
                type="button"
                onClick={() => handleSelectType('transfer')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-transfer/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-transfer/10 text-transfer flex items-center justify-center shrink-0 border border-transfer/20">
                    <ArrowsLeftRight size={17} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-transfer transition-colors">
                      Transfer Dompet
                    </p>
                    <p className="text-[10px] text-text-muted truncate">Pindah saldo kas/bank</p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted">
                  T
                </kbd>
              </button>
            </div>
          )}
        </div>

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
