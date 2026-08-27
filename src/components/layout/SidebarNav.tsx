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
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface border-r border-border min-h-screen p-4 sticky top-0 h-screen justify-between transition-all overflow-y-auto no-scrollbar select-none">
      <div className="space-y-4">
        {/* Brand Identity Header */}
        <div className="flex items-center gap-3 px-1 pt-0.5">
          <div className="w-9 h-9 bg-primary text-primary-fg rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 ring-1 ring-primary/20 shrink-0">
            <Wallet size={20} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold text-text leading-tight tracking-tight">KasPribadi</h1>
            <p className="text-[11px] text-text-muted font-medium truncate">{familyName}</p>
          </div>
        </div>

        {/* Action Button: Catat Transaksi with Dropdown Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            className="w-full h-9.5 bg-primary hover:bg-primary-hover active:scale-[0.98] text-primary-fg font-bold rounded-xl flex items-center justify-between px-3.5 shadow-sm shadow-primary/20 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} weight="bold" />
              <span>Catat Transaksi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-medium">N</span>
              <CaretDown
                size={12}
                weight="bold"
                className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Dropdown Menu Card */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-surface/98 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                Pilih Jenis Transaksi
              </div>

              {/* Option 1: Pengeluaran */}
              <button
                type="button"
                onClick={() => handleSelectType('expense')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-expense/10 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-expense/10 text-expense flex items-center justify-center shrink-0 border border-expense/20">
                    <ArrowDownRight size={15} weight="bold" />
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
                  <div className="w-7 h-7 rounded-lg bg-income/10 text-income flex items-center justify-center shrink-0 border border-income/20">
                    <ArrowUpRight size={15} weight="bold" />
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
                  <div className="w-7 h-7 rounded-lg bg-transfer/10 text-transfer flex items-center justify-center shrink-0 border border-transfer/20">
                    <ArrowsLeftRight size={15} weight="bold" />
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

        {/* Grouped Section Navigation */}
        <nav className="space-y-3 pt-0.5">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {/* Section Heading */}
              <div className="px-2.5 pt-1.5 pb-1 text-[9.5px] font-bold uppercase tracking-widest text-text-muted/60">
                {section.title}
              </div>

              {/* Sub-menu Item List */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all group ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                          : 'text-text/75 font-medium hover:text-text hover:bg-surface-2 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={17}
                          weight={isActive ? 'duotone' : 'regular'}
                          className={`shrink-0 transition-transform duration-150 ${
                            isActive ? 'text-primary' : 'text-text-muted group-hover:text-text'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-md ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'bg-primary/15 text-primary border border-primary/20'
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

      {/* Bottom Profile Card */}
      <div className="space-y-3 pt-3 border-t border-border mt-3">
        {/* User Profile Card with Logout Trigger */}
        <div className="p-1.5 rounded-2xl bg-surface-2/40 border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0 pl-1">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-text truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-text-muted truncate leading-tight">Akun Terhubung</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Keluar dari Akun"
            className="p-2 text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors shrink-0"
            aria-label="Keluar"
          >
            <SignOut size={16} weight="bold" />
          </button>
        </div>
      </div>
    </aside>
  );
}
