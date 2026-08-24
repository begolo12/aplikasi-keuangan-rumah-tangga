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
  Heartbeat,
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
        { id: 'evaluation', label: 'Evaluasi Keuangan', icon: Heartbeat, badge: 'Baru' },
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
    <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 bg-surface border-r border-border min-h-screen p-3 sticky top-0 h-screen justify-between transition-all overflow-y-auto no-scrollbar select-none">
      <div className="space-y-3">
        {/* Top Brand Logo */}
        <div className="flex items-center gap-2 px-1.5 pt-0.5">
          <div className="w-8 h-8 bg-primary text-primary-fg rounded-xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Wallet size={19} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-text leading-tight truncate">KasPribadi</h2>
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
            className="w-full h-8.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-xl flex items-center justify-between px-3 shadow-2xs active:scale-98 transition-all text-xs group"
          >
            <div className="flex items-center gap-1.5">
              <Plus size={15} weight="bold" />
              <span>Catat Transaksi</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-mono">N</span>
              <CaretDown
                size={11}
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
                className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-expense/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-expense/10 text-expense flex items-center justify-center shrink-0 border border-expense/20">
                    <ArrowDownRight size={14} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-expense transition-colors">
                      Pengeluaran
                    </p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1 py-0.2 rounded text-[9px] font-mono text-text-muted">
                  E
                </kbd>
              </button>

              {/* Option 2: Pemasukan */}
              <button
                type="button"
                onClick={() => handleSelectType('income')}
                className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-income/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-income/10 text-income flex items-center justify-center shrink-0 border border-income/20">
                    <ArrowUpRight size={14} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-income transition-colors">
                      Pemasukan
                    </p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1 py-0.2 rounded text-[9px] font-mono text-text-muted">
                  I
                </kbd>
              </button>

              {/* Option 3: Transfer */}
              <button
                type="button"
                onClick={() => handleSelectType('transfer')}
                className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-transfer/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-transfer/10 text-transfer flex items-center justify-center shrink-0 border border-transfer/20">
                    <ArrowsLeftRight size={14} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text group-hover:text-transfer transition-colors">
                      Transfer
                    </p>
                  </div>
                </div>
                <kbd className="bg-surface-2 border border-border px-1 py-0.2 rounded text-[9px] font-mono text-text-muted">
                  T
                </kbd>
              </button>
            </div>
          )}
        </div>

        {/* Hierarchical Grouped Navigation */}
        <nav className="space-y-2.5">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {/* Section Head */}
              <div className="px-2 pt-1 pb-0.5 text-[9px] font-extrabold uppercase tracking-wider text-text-muted/60">
                {section.title}
              </div>

              {/* Sub-menu Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all group ${
                        isActive
                          ? 'bg-primary text-white shadow-2xs font-bold'
                          : 'text-text-muted hover:text-text hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={16}
                          weight={isActive ? 'fill' : 'regular'}
                          className={`shrink-0 transition-transform duration-150 ${
                            isActive ? 'text-white' : 'text-text-muted group-hover:text-text'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
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
      <div className="space-y-2 pt-2 border-t border-border mt-2">
        {/* Keyboard shortcut guide - Ultra Compact */}
        <div className="bg-background/60 p-1.5 rounded-xl border border-border/40 text-[9px] text-text-muted space-y-0.5 hidden lg:block">
          <div className="flex items-center justify-between font-bold text-text px-0.5">
            <span className="flex items-center gap-1">
              <Keyboard size={11} />
              <span>Pintasan</span>
            </span>
            <span className="text-[8px] text-text-muted">Keyboard</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] pt-0.5 px-0.5">
            <div className="flex items-center justify-between">
              <span>Keluar</span>
              <kbd className="bg-surface px-1 rounded border font-mono text-[8px]">E</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Masuk</span>
              <kbd className="bg-surface px-1 rounded border font-mono text-[8px]">I</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Transfer</span>
              <kbd className="bg-surface px-1 rounded border font-mono text-[8px]">T</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Tutup</span>
              <kbd className="bg-surface px-1 rounded border font-mono text-[8px]">Esc</kbd>
            </div>
          </div>
        </div>

        {/* User profile info & logout */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <div className="w-6.5 h-6.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0">
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
            className="p-1 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors shrink-0"
          >
            <SignOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
