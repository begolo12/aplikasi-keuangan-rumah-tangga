'use client';

import React, { useEffect } from 'react';
import { SidebarNav } from './SidebarNav';
import { BottomNav, NavTab } from './BottomNav';
import { TopHeader } from './TopHeader';
import { OfflineBanner } from './OfflineBanner';
import { IosInstallPrompt } from './IosInstallPrompt';

import { TransactionType } from '@/lib/types';

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenTypedModal?: (type: TransactionType) => void;
  currentMonth: number;
  currentYear: number;
  onPeriodChange: (month: number, year: number) => void;
  userName?: string;
  familyName?: string;
  userEmail?: string;
  userId: string;
  onLogout: () => void;
  onDataRefresh?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenTypedModal,
  currentMonth,
  currentYear,
  onPeriodChange,
  userName,
  userEmail,
  familyName,
  userId,
  onLogout,
  onDataRefresh,
  children,
}: AppShellProps) {
  // Desktop keyboard shortcuts: N / E for Expense, I for Income, T for Transfer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      const key = e.key.toLowerCase();
      const openModal = onOpenTypedModal || ((_t: TransactionType) => onOpenAddModal());

      if (key === 'n' || key === 'e') {
        e.preventDefault();
        openModal('expense');
      } else if (key === 'i') {
        e.preventDefault();
        openModal('income');
      } else if (key === 't') {
        e.preventDefault();
        openModal('transfer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddModal, onOpenTypedModal]);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col md:flex-row">
      {/* Sidebar for Desktop & Tablet */}
      <SidebarNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenAddModal={onOpenAddModal}
        userName={userName}
        familyName={familyName}
        onLogout={onLogout}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Offline notification banner */}
        <OfflineBanner userId={userId} onSynced={onDataRefresh} />

        {/* Period & User Top Header */}
        <TopHeader
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPeriodChange={onPeriodChange}
          userName={userName}
          userEmail={userEmail}
          familyName={familyName}
          onNavigateToSettings={() => onTabChange('settings')}
          onLogout={onLogout}
        />

        {/* Content View Body */}
        <main className="flex-1 p-2.5 sm:p-4 md:p-6 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenAddModal={onOpenAddModal}
      />

      {/* iOS Safari Home Screen Banner */}
      <IosInstallPrompt />
    </div>
  );
}
