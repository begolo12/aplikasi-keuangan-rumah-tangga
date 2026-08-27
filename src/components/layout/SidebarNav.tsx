'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  House,
  ListDashes,
  Vault,
  Receipt,
  Wallet,
  HandCoins,
  Target,
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
  SidebarSimple,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load user collapse preference
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('kaskeluarga_sidebar_collapsed');
      if (savedState !== null) {
        setIsCollapsed(savedState === 'true');
      }
    } catch {
      // Ignore localStorage read errors in SSR/strict contexts
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kaskeluarga_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

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
        { id: 'goals', label: 'Target Tabungan', icon: Target },
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
        { id: 'evaluation', label: 'Evaluasi Keuangan', icon: Heartbeat },
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
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-surface border-r border-border min-h-screen sticky top-0 h-screen justify-between transition-all duration-300 ease-in-out overflow-y-auto no-scrollbar select-none z-30 ${
        isCollapsed ? 'w-[72px] px-2.5 py-4' : 'w-64 p-4'
      }`}
    >
      <div className="space-y-4">
        {/* Brand Identity Header + Toggle Button */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between gap-2 px-1 pt-0.5'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div
              onClick={() => isCollapsed && toggleCollapsed()}
              className={`w-9 h-9 bg-primary text-primary-fg rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 ring-1 ring-primary/20 shrink-0 ${
                isCollapsed ? 'cursor-pointer hover:scale-105 transition-transform' : ''
              }`}
              title={isCollapsed ? 'Klik untuk memperluas sidebar' : undefined}
            >
              <Wallet size={20} weight="duotone" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-extrabold text-text leading-tight tracking-tight">KasPribadi</h1>
                <p className="text-[11px] text-text-muted font-medium truncate">{familyName}</p>
              </div>
            )}
          </div>

          {/* Toggle Collapse/Expand Button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Buka Sidebar Penuh' : 'Sembunyikan / Kecilkan Sidebar'}
            aria-label={isCollapsed ? 'Buka Sidebar' : 'Kecilkan Sidebar'}
            className={`text-text-muted hover:text-text hover:bg-surface-2 p-1.5 rounded-xl transition-all ${
              isCollapsed ? 'w-full flex justify-center py-1 mt-1 border border-border/40' : 'shrink-0'
            }`}
          >
            <SidebarSimple size={18} weight={isCollapsed ? 'fill' : 'regular'} className="transition-transform duration-200" />
          </button>
        </div>

        {/* Action Button: Catat Transaksi with Dropdown Popover */}
        <div className="relative" ref={dropdownRef}>
          {isCollapsed ? (
            /* Mini Icon Add Button */
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                aria-label="Catat Transaksi"
                className="w-10 h-10 bg-primary hover:bg-primary-hover active:scale-95 text-primary-fg font-bold rounded-2xl flex items-center justify-center shadow-md shadow-primary/25 transition-all"
              >
                <Plus size={20} weight="bold" />
              </button>

              {/* Tooltip on Mini Button hover */}
              {!isDropdownOpen && (
                <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                  <div className="bg-surface border border-border text-text font-bold text-xs px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                    Catat Transaksi (N)
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Full Action Button */
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
          )}

          {/* Dropdown Menu Card */}
          {isDropdownOpen && (
            <div
              className={`absolute z-50 bg-surface/98 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
                isCollapsed
                  ? 'left-full top-0 ml-2.5 w-60'
                  : 'left-0 right-0 top-full mt-2'
              }`}
            >
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
              {/* Section Heading or Divider */}
              {isCollapsed ? (
                <div className="my-1.5 border-t border-border/40 mx-1" />
              ) : (
                <div className="px-2.5 pt-1.5 pb-1 text-[9.5px] font-bold uppercase tracking-widest text-text-muted/60">
                  {section.title}
                </div>
              )}

              {/* Sub-menu Item List */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div key={item.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => onTabChange(item.id)}
                        aria-label={item.label}
                        className={`w-full flex items-center rounded-xl text-xs transition-all ${
                          isCollapsed
                            ? 'justify-center p-2.5'
                            : 'justify-between px-2.5 py-1.5'
                        } ${
                          isActive
                            ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                            : 'text-text/75 font-medium hover:text-text hover:bg-surface-2 border border-transparent'
                        }`}
                      >
                        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                          <Icon
                            size={18}
                            weight={isActive ? 'duotone' : 'regular'}
                            className={`shrink-0 transition-transform duration-150 ${
                              isActive ? 'text-primary' : 'text-text-muted group-hover:text-text'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
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

                        {/* Dot indicator for active in mini mode */}
                        {isCollapsed && isActive && (
                          <span className="absolute right-1 top-1 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-surface" />
                        )}
                      </button>

                      {/* Tooltip on Mini Mode */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                          <div className="bg-surface border border-border text-text font-bold text-xs px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap flex items-center gap-2">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-primary text-white">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile Card */}
      <div className="space-y-3 pt-3 border-t border-border mt-3">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <div
                className="w-8 h-8 rounded-xl bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs cursor-default"
                title={userName}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-surface border border-border text-text font-bold text-xs px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  {userName}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Keluar dari Akun"
              aria-label="Keluar"
              className="p-2 text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors shrink-0"
            >
              <SignOut size={16} weight="bold" />
            </button>
          </div>
        ) : (
          /* Full User Profile Card with Logout Trigger */
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
        )}
      </div>
    </aside>
  );
}
