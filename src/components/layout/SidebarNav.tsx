'use client';

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
  TrendUp,
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

interface NavSection {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
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

  const NAV_SECTIONS: NavSection[] = [
    {
      title: 'Utama',
      items: [
        { id: 'dashboard', label: 'Beranda', icon: House },
        { id: 'transactions', label: 'Riwayat Transaksi', icon: ListDashes },
      ],
    },
    {
      title: 'Kas & Anggaran',
      items: [
        { id: 'wallets', label: 'Pos Kas & Rekening', icon: Wallet },
        { id: 'budget', label: 'Anggaran Bulanan', icon: Vault },
        { id: 'bills', label: 'Tagihan Rutin', icon: Receipt },
      ],
    },
    {
      title: 'Aset & Kewajiban',
      items: [
        { id: 'assets', label: 'Aset & Depresiasi', icon: Package },
        { id: 'debts', label: 'Hutang & Piutang', icon: HandCoins },
      ],
    },
    {
      title: 'Laporan & Evaluasi',
      items: [
        { id: 'reports', label: 'Laporan & Ekspor', icon: ChartPieSlice },
        { id: 'reports', label: 'Evaluasi Arus Kas', icon: TrendUp, badge: 'Aktif' },
      ],
    },
    {
      title: 'Sistem',
      items: [
        { id: 'settings', label: 'Pengaturan & Backup', icon: Gear },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-surface border-r border-border min-h-screen p-3.5 sticky top-0 h-screen justify-between transition-all overflow-y-auto no-scrollbar">
      <div className="space-y-3.5">
        {/* Top Brand Logo */}
        <div className="flex items-center gap-2.5 px-1.5 pt-1">
          <div className="w-8 h-8 lg:w-9 lg:h-9 bg-primary text-primary-fg rounded-xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Wallet size={20} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm lg:text-base font-extrabold text-text leading-tight truncate">KasPribadi</h2>
            <p className="text-[10px] text-text-muted font-medium truncate">{familyName}</p>
          </div>
        </div>

        {/* Quick Add Button with Dropdown Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            className="w-full h-9 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-xl flex items-center justify-between px-3 shadow-xs active:scale-98 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} weight="bold" />
              <span>Catat Transaksi</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-mono">N</span>
              <CaretDown
                size={12}
                weight="bold"
                className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Dropdown Popover Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface border border-border rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-0.5 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                Pilih Jenis Transaksi
              </div>

              {/* Option 1: Pengeluaran */}
              <button
                type="button"
                onClick={() => handleSelectType('expense')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-expense/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-expense/10 text-expense flex items-center justify-center shrink-0 border border-expense/20">
                    <ArrowDownRight size={15} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-expense transition-colors">
                      Pengeluaran
                    </p>
                    <p className="text-[9px] text-text-muted truncate">Belanja & uang keluar</p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-[9px] font-mono text-text-muted">
                  E
                </kbd>
              </button>

              {/* Option 2: Pemasukan */}
              <button
                type="button"
                onClick={() => handleSelectType('income')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-income/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-income/10 text-income flex items-center justify-center shrink-0 border border-income/20">
                    <ArrowUpRight size={15} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-income transition-colors">
                      Pemasukan
                    </p>
                    <p className="text-[9px] text-text-muted truncate">Gaji, bonus & dividen</p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-[9px] font-mono text-text-muted">
                  I
                </kbd>
              </button>

              {/* Option 3: Transfer */}
              <button
                type="button"
                onClick={() => handleSelectType('transfer')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-transfer/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-transfer/10 text-transfer flex items-center justify-center shrink-0 border border-transfer/20">
                    <ArrowsLeftRight size={15} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-transfer transition-colors">
                      Transfer Dompet
                    </p>
                    <p className="text-[9px] text-text-muted truncate">Pindah saldo kas/bank</p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-[9px] font-mono text-text-muted">
                  T
                </kbd>
              </button>
            </div>
          )}
        </div>

        {/* Hierarchical Grouped Navigation */}
        <nav className="space-y-3">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {/* Section Head */}
              <div className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-text-muted/70 flex items-center justify-between">
                <span>{section.title}</span>
              </div>

              {/* Sub-menu Items */}
              <div className="space-y-0.5">
                {section.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={`${sIdx}-${iIdx}-${item.id}`}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-semibold text-xs transition-all group ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs font-bold'
                          : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={17}
                          weight={isActive ? 'duotone' : 'regular'}
                          className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                            isActive ? 'text-primary' : 'text-text-muted group-hover:text-text'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile & Shortcuts */}
      <div className="space-y-2.5 pt-2.5 border-t border-border mt-3">
        {/* Keyboard shortcut guide - High Density */}
        <div className="bg-background/60 p-2 rounded-xl border border-border/50 text-[10px] text-text-muted space-y-1 hidden lg:block">
          <div className="flex items-center justify-between font-bold text-text">
            <span className="flex items-center gap-1">
              <Keyboard size={12} />
              <span>Pintasan</span>
            </span>
            <span className="text-[9px] font-normal text-text-muted">Cepat</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] pt-0.5">
            <div className="flex items-center justify-between">
              <span>Keluar</span>
              <kbd className="bg-surface px-1 rounded border font-mono">E</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Masuk</span>
              <kbd className="bg-surface px-1 rounded border font-mono">I</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Transfer</span>
              <kbd className="bg-surface px-1 rounded border font-mono">T</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Tutup</span>
              <kbd className="bg-surface px-1 rounded border font-mono">Esc</kbd>
            </div>
          </div>
        </div>

        {/* User profile info & logout */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-text truncate">{userName}</p>
              <p className="text-[9px] text-text-muted truncate">{familyName}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Keluar dari Akun"
            className="p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors shrink-0"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
